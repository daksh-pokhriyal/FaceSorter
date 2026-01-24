# Face Recognition Photo Sorting System

A full-stack face recognition project that sorts photos automatically by matching a target face inside a folder of images.

Upload:
✅ 1 Target Face Image  
✅ Multiple Photos (single face or group photos)  
Then the system detects faces, matches the target, and gives you **downloadable ZIP files** for:
📦 Matched photos  
📦 Not matched photos  

---

## 🚀 Demo Video
▶️ YouTube Demo: https://www.youtube.com/watch?v=_xG9CviE5Fs

---

## ✨ Features
- ✅ Upload target face + multiple photos
- ✅ Detects multiple faces in group photos
- ✅ Hybrid matching system:
  - **SVM Classifier** (Fast identity prediction)
  - **Cosine Similarity** (Face embedding verification)
- ✅ Similarity-only mode for unknown targets
- ✅ Choose face detector:
  - MTCNN
  - RetinaFace
- ✅ Adjustable similarity threshold slider
- ✅ Downloads results as ZIP files:
  - `matched.zip`
  - `not_matched.zip`
- ✅ Clean modern UI with progress bar + results stats



This project is now a hybrid system that uses both:
* SVM (classification) → for people who are in your dataset (fast + strong)
* Cosine similarity (verification) → as a backup when SVM is unsure / fails, and also for unknown-person matching
So it works like this for every face it finds:
1. Try SVM match
2. If SVM doesn’t confidently match → try cosine similarity
3. If either succeeds →  MATCH



Step 1: Try SVM match (fast + accurate)
It predicts label using SVM.If:
* label == emma_watson
* score >= svm_score_threshold
 then it marks the image as MATCH.

Step 2: If SVM fails → it tries Similarity
If SVM didn’t match, it calculates:
cosine distance between:
* target embedding
* face embedding
If:

dist <= similarity_threshold
then it still marks the image as MATCH.







---

## 🧠 How It Works (Pipeline)

1. **Target Face Upload**
2. **Face Detection** (MTCNN / RetinaFace)
3. **Face Embedding Extraction** using **FaceNet512** (512-D vector)
4. **Matching**
   - SVM predicts identity (celebrity-trained classifier)
   - Cosine similarity verifies the match
5. **Sorting**
   - matched → `matched/`
   - not matched → `not_matched/`
6. **Export**
   - ZIP download generated for both outputs

> ⚠️ Note: The SVM model is trained on celebrity identities only.  
> If a target face is not in the training dataset, it may still predict the closest celebrity match.  
> Final matching is validated using cosine similarity.

---

## 🛠 Tech Stack
### Frontend
- React (Vite)
- CSS (modern responsive UI)

### Backend
- FastAPI (Python)
- DeepFace (Face Recognition)
- FaceNet512 (Embeddings)
- MTCNN / RetinaFace (Detection)
- Scikit-learn (SVM Classifier)
- Joblib (Model Saving)
- ZIP export for downloads

---

