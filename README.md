<img width="1390" height="1176" alt="Blank board" src="https://github.com/user-attachments/assets/81f471a1-570c-43db-9d57-7fe8670cc2e6" /># Face Recognition Photo Sorting System

A **face recognition project** that automatically sorts photos by matching a **target face** inside a folder of images.

Upload **1 Target Face Image**  
Upload **Multiple Photos** *(single face or group photos)*  
➡️ The system detects faces, matches the target face, and gives you downloadable ZIP files:

`matched.zip` → photos where the target face is found  
`not_matched.zip` → photos where the target face is not found  

---

## Demo Video
**YouTube Demo:** [https://www.youtube.com/watch?v=_xG9CviE5Fs](https://youtu.be/NIYn7HLk6Gc)

---

## Features
○ Upload target face + multiple photos  
○ Detects multiple faces inside group photos  
○ **Hybrid Matching System**
- **SVM Classifier** (Fast identity prediction)
- **Cosine Similarity** (Face embedding verification)

○ **Similarity-only mode** for unknown targets  
○ Choose face detector:
- **MTCNN**
- **RetinaFace**

○ Adjustable **Similarity Threshold Slider**  
○ Downloads results as ZIP files:
- `matched.zip`
- `not_matched.zip` 

---

## Hybrid Matching Logic (SVM + Similarity)

This project is a **hybrid system** that uses both:

○ **SVM (classification)** → for people who exist in your dataset (fast + strong)  
○ **Cosine Similarity (verification)** → fallback when SVM is unsure/fails and also works for unknown-person matching  

For every face detected in an image, the system follows this logic:

### Step 1: Try SVM match (Fast + Accurate)
The SVM predicts the identity label and score.

If:
- `predicted_label == target_label`
- `score >= svm_score_threshold`

Then it marks the image as **MATCHED**

###  Step 2: If SVM fails → Try Cosine Similarity (Verification)
If SVM doesn’t match confidently, the system calculates:

cosine distance between:
- target face embedding  
- detected face embedding  

If:
- `distance <= similarity_threshold`

Then it still marks the image as **MATCHED**

➡️ **If either SVM OR similarity succeeds → MATCH ✅**

---

## How It Works (Pipeline)

1. **Target Face Upload**
2. **Face Detection** *(MTCNN / RetinaFace)*
3. **Face Embedding Extraction** using **FaceNet512** *(512-D vector)*
4. **Matching**
   - SVM predicts identity *(celebrity-trained classifier)*
   - Cosine similarity verifies match
5. **Sorting**
   - matched → `matched/`
   - not matched → `not_matched/`
6. **Export**
   - ZIP download generated for both outputs

---

## Important Note
○ The **SVM model is trained on celebrity identities only**.  
If the target face is not in the training dataset, it may still predict the closest celebrity match.

○ Final matching is always validated using **cosine similarity**, so unknown persons can still work correctly.

---

## Flowchart 








## Tech Stack

### Frontend
- React (Vite)
- CSS (Modern responsive UI)

### Backend
- FastAPI (Python)
- DeepFace (Face Recognition)
- FaceNet512 (Embeddings)
- MTCNN / RetinaFace (Face Detection)
- Scikit-learn (SVM Classifier)
- Joblib (Model Saving)
- ZIP Export (Downloads)

---

## 📁 Basic Folder Structure

```bash
FaceSorter_clean/
│
├── frontend/
│   └── client/
│       ├── public/
│       │   └── fallback.png
│       ├── src/
│       │   ├── App.jsx
│       │   ├── App.css
│       │   └── main.jsx
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       └── ...
│
├── server/
│   ├── models/
│   │   ├── svm_model.pkl
│   │   └── label_encoder.pkl
│   ├── runs/                  # output generated per request
│   │   └── <run_id>/
│   │       ├── matched/
│   │       ├── not_matched/
│   │       ├── matched.zip
│   │       └── not_matched.zip
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
├── .gitignore
├── README.md
