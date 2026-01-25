import os
import shutil
import zipfile
from uuid import uuid4

import numpy as np
import joblib
from deepface import DeepFace
from sklearn.metrics.pairwise import cosine_similarity

from fastapi import FastAPI,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse,JSONResponse
from fastapi.staticfiles import StaticFiles


BASE_URL=os.getenv("https://facesorter.onrender.com","http://127.0.0.1:8000").rstrip("/")

# ✅ Render Frontend URL
FRONTEND_URL=os.getenv(
  "https://facesorter-frontend.onrender.com",
  "http://localhost:5173"
).rstrip("/")


app=FastAPI()


# ✅ CORS (Render Frontend + Local)
app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    FRONTEND_URL
  ],
  allow_credentials=False,
  allow_methods=["*"],
  allow_headers=["*"],
)


BASE_DIR=os.path.dirname(os.path.abspath(__file__))
RUNS_DIR=os.path.join(BASE_DIR,"runs")
os.makedirs(RUNS_DIR,exist_ok=True)

# ✅ serve preview images
app.mount("/runs",StaticFiles(directory=RUNS_DIR),name="runs")


def cosine_distance(a,b):
  sim=cosine_similarity([a],[b])[0][0]
  return 1.0-float(sim)


def get_embedding(img_path,detector_backend,embed_model):
  rep=DeepFace.represent(
    img_path=img_path,
    model_name=embed_model,
    detector_backend=detector_backend,
    enforce_detection=True
  )
  return np.array(rep[0]["embedding"],dtype=np.float32)


@app.get("/")
def home():
  return {
    "status":"✅ Face Sorter backend running",
    "base_url":BASE_URL,
    "frontend_url":FRONTEND_URL
  }


@app.post("/sort")
async def sort_images(
  target:UploadFile=File(...),
  images:list[UploadFile]=File(...),
  mode:str=File("hybrid"),
  detector:str=File("mtcnn"),
  similarity_threshold:float=File(0.42)
):
  run_id=str(uuid4())
  run_dir=os.path.join(RUNS_DIR,run_id)

  target_dir=os.path.join(run_dir,"target_face")
  input_dir=os.path.join(run_dir,"input_images")
  matched_dir=os.path.join(run_dir,"matched")
  not_matched_dir=os.path.join(run_dir,"not_matched")

  os.makedirs(target_dir,exist_ok=True)
  os.makedirs(input_dir,exist_ok=True)
  os.makedirs(matched_dir,exist_ok=True)
  os.makedirs(not_matched_dir,exist_ok=True)

  # ✅ save target
  target_path=os.path.join(target_dir,"target.jpg")
  with open(target_path,"wb") as f:
    f.write(await target.read())

  # ✅ save input images
  for img in images:
    save_path=os.path.join(input_dir,img.filename)
    with open(save_path,"wb") as f:
      f.write(await img.read())

  # ✅ load svm model + encoder
  svm_model_path=os.path.join(BASE_DIR,"models","svm_model.pkl")
  encoder_path=os.path.join(BASE_DIR,"models","label_encoder.pkl")

  if (not os.path.exists(svm_model_path)) or (not os.path.exists(encoder_path)):
    return JSONResponse(
      status_code=500,
      content={"error":"Model files missing in server/models/"}
    )

  svm_model=joblib.load(svm_model_path)
  label_encoder=joblib.load(encoder_path)

  detector_backend=detector
  embed_model="Facenet512"

  svm_score_threshold=0.0
  similarity_threshold=float(similarity_threshold)

  # ✅ target embedding
  target_emb=get_embedding(target_path,detector_backend,embed_model)

  # ✅ target label by SVM
  target_scores=svm_model.decision_function([target_emb])[0]
  target_best_idx=int(np.argmax(target_scores))
  target_best_score=float(target_scores[target_best_idx])
  target_label=label_encoder.inverse_transform([target_best_idx])[0]

  use_svm=(target_best_score>=svm_score_threshold)

  if mode=="similarity":
    use_svm=False

  matched_count=0
  not_matched_count=0
  total_scanned=0

  valid_exts=(".jpg",".jpeg",".png",".webp")

  for img_name in os.listdir(input_dir):
    if not img_name.lower().endswith(valid_exts):
      continue

    total_scanned+=1
    img_path=os.path.join(input_dir,img_name)

    try:
      faces=DeepFace.extract_faces(
        img_path=img_path,
        detector_backend=detector_backend,
        enforce_detection=False
      )

      found=False

      for face_obj in faces:
        face_img=face_obj["face"]

        rep=DeepFace.represent(
          img_path=face_img,
          model_name=embed_model,
          detector_backend="skip",
          enforce_detection=False
        )

        if not rep or len(rep)==0:
          continue

        emb=np.array(rep[0]["embedding"],dtype=np.float32)
        dist=cosine_distance(target_emb,emb)

        if use_svm:
          face_scores=svm_model.decision_function([emb])[0]
          face_best_idx=int(np.argmax(face_scores))
          face_score=float(face_scores[face_best_idx])
          face_label=label_encoder.inverse_transform([face_best_idx])[0]

          if (face_label==target_label) and (face_score>=svm_score_threshold):
            found=True
            break

          if dist<=similarity_threshold:
            found=True
            break
        else:
          if dist<=similarity_threshold:
            found=True
            break

      if found:
        shutil.copy(img_path,os.path.join(matched_dir,img_name))
        matched_count+=1
      else:
        shutil.copy(img_path,os.path.join(not_matched_dir,img_name))
        not_matched_count+=1

    except Exception:
      shutil.copy(img_path,os.path.join(not_matched_dir,img_name))
      not_matched_count+=1

  # ✅ zip matched images
  matched_zip_path=os.path.join(run_dir,"matched.zip")
  with zipfile.ZipFile(matched_zip_path,"w") as z:
    for file_name in os.listdir(matched_dir):
      full_path=os.path.join(matched_dir,file_name)
      z.write(full_path,arcname=file_name)

  # ✅ zip not matched images
  not_matched_zip_path=os.path.join(run_dir,"not_matched.zip")
  with zipfile.ZipFile(not_matched_zip_path,"w") as z:
    for file_name in os.listdir(not_matched_dir):
      full_path=os.path.join(not_matched_dir,file_name)
      z.write(full_path,arcname=file_name)

  # ✅ preview urls (first 24)
  matched_files=sorted(os.listdir(matched_dir))[:24]
  not_matched_files=sorted(os.listdir(not_matched_dir))[:24]

  matched_preview_urls=[
    f"{BASE_URL}/runs/{run_id}/matched/{name}"
    for name in matched_files
  ]

  not_matched_preview_urls=[
    f"{BASE_URL}/runs/{run_id}/not_matched/{name}"
    for name in not_matched_files
  ]

  return {
    "run_id":run_id,
    "total_scanned":total_scanned,
    "matched_count":matched_count,
    "not_matched_count":not_matched_count,
    "target_label":target_label,
    "target_score":target_best_score,
    "matched_zip_url":f"{BASE_URL}/download/{run_id}/matched",
    "not_matched_zip_url":f"{BASE_URL}/download/{run_id}/not_matched",
    "matched_preview_urls":matched_preview_urls,
    "not_matched_preview_urls":not_matched_preview_urls
  }


@app.get("/download/{run_id}/matched")
def download_matched_zip(run_id:str):
  run_dir=os.path.join(RUNS_DIR,run_id)
  zip_path=os.path.join(run_dir,"matched.zip")

  if not os.path.exists(zip_path):
    return JSONResponse(status_code=404,content={"error":"matched.zip not found"})

  return FileResponse(zip_path,filename="matched.zip")


@app.get("/download/{run_id}/not_matched")
def download_not_matched_zip(run_id:str):
  run_dir=os.path.join(RUNS_DIR,run_id)
  zip_path=os.path.join(run_dir,"not_matched.zip")

  if not os.path.exists(zip_path):
    return JSONResponse(status_code=404,content={"error":"not_matched.zip not found"})

  return FileResponse(zip_path,filename="not_matched.zip")
