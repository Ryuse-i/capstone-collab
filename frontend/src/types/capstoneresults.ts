export interface CapstoneResult {
  id: string;
  title: string;
  description: string;
  abstract: string;
  tags: string[];
  year: string;
  authors: string;
  techStack: string[];
  keyFeatures: string[];
}

export const results: CapstoneResult[] = [
  {
    id: "ai-diabetes-detection",
    title: "AI-Based Early Detection of Diabetes Using Machine Learning",
    description:
      "Developing a machine learning model to predict diabetes onset using patient health data and lifestyle factors.",
    abstract:
      "Type 2 diabetes is frequently diagnosed only after complications have already begun, largely because early symptoms are subtle and easy to miss in routine checkups. This study proposes a machine learning pipeline that predicts diabetes risk using a combination of clinical measurements (glucose levels, BMI, blood pressure) and self-reported lifestyle factors (diet, physical activity, sleep patterns). Three models — logistic regression, random forest, and XGBoost — were trained and compared on a dataset of 4,200 patient records. The XGBoost model achieved the highest performance, with an AUC-ROC of 0.91 and 87% recall on positive cases, suggesting the approach could support earlier screening in primary care settings.",
    tags: [
      "Artificial Intelligence",
      "Machine Learning",
      "Healthcare",
      "Predictive Analysis",
    ],
    year: "2025",
    authors: "Sarah Johnson, Michael Chen",
    techStack: ["Python", "scikit-learn", "XGBoost", "Pandas", "Flask"],
    keyFeatures: [
      "Risk scoring model trained on clinical + lifestyle data",
      "Comparison of 3 ML algorithms with performance benchmarking",
      "Web-based screening form for clinicians to input patient data",
      "Explainability layer (SHAP values) showing top risk factors per prediction",
    ],
  },
  {
    id: "blockchain-supply-chain",
    title: "Blockchain-Based Supply Chain Transparency System",
    description:
      "A decentralized system for tracking and verifying supply chain transactions using blockchain technology.",
    abstract:
      "Supply chains involving multiple intermediaries often suffer from limited traceability, making it difficult to verify the origin and handling of goods. This project implements a permissioned blockchain network that records each transaction — from raw material sourcing to final delivery — as an immutable ledger entry. Smart contracts automatically validate handoffs between supply chain participants (suppliers, manufacturers, distributors, retailers), flagging discrepancies in real time. A pilot deployment with a simulated agricultural supply chain of 5 participants demonstrated a reduction in dispute resolution time from an average of 4 days to under 2 hours.",
    tags: ["Blockchain", "Supply Chain", "Decentralized"],
    year: "2025",
    authors: "Mark Rivera, Anna Cruz",
    techStack: ["Solidity", "Hyperledger Fabric", "Node.js", "React", "IPFS"],
    keyFeatures: [
      "Smart contracts for automated handoff verification between parties",
      "Immutable transaction ledger with full audit trail",
      "Role-based dashboard for suppliers, distributors, and retailers",
      "QR-code product tracing from origin to point of sale",
    ],
  },
  {
    id: "nlp-sentiment-analysis",
    title: "Natural Language Processing for Sentiment Analysis in Social Media",
    description:
      "Using NLP techniques to analyze public sentiment from social media posts in real time.",
    abstract:
      "Brands and public institutions increasingly rely on social media sentiment to gauge public reaction, but manual monitoring does not scale with post volume. This project builds a real-time sentiment analysis pipeline that ingests social media posts via API, classifies sentiment (positive, negative, neutral) using a fine-tuned transformer model, and surfaces trends through an interactive dashboard. The model was fine-tuned on a labeled dataset of 50,000 posts and achieved 89% classification accuracy, outperforming baseline lexicon-based approaches by 14 percentage points. The system also detects emerging topic clusters using keyword co-occurrence analysis.",
    tags: ["Natural Language Processing", "Sentiment Analysis", "Social Media"],
    year: "2024",
    authors: "Luis Reyes, Carla Mendes",
    techStack: ["Python", "Hugging Face Transformers", "FastAPI", "PostgreSQL", "Vue.js"],
    keyFeatures: [
      "Fine-tuned transformer model for 3-class sentiment classification",
      "Real-time ingestion pipeline from social media APIs",
      "Interactive dashboard with sentiment trends over time",
      "Automatic topic clustering to surface emerging discussion themes",
    ],
  },
  {
    id: "cv-autonomous-navigation",
    title: "Computer Vision for Autonomous Vehicle Navigation",
    description:
      "Implementing object detection and lane recognition for self-driving car systems.",
    abstract:
      "Reliable perception is a core requirement for autonomous vehicle safety, particularly in detecting road boundaries and nearby obstacles under varying lighting and weather conditions. This project implements a computer vision pipeline combining YOLOv8 for real-time object detection with a custom lane-segmentation model based on a U-Net architecture. The system was tested on a simulated driving environment across 12 scenario types (day, night, rain, occlusion) and achieved 94% object detection accuracy and 91% lane boundary accuracy, with an average inference time of 28ms per frame — within the threshold required for real-time navigation decisions.",
    tags: ["Computer Vision", "Autonomous", "Deep Learning"],
    year: "2024",
    authors: "James Park, Elena Gomez",
    techStack: ["Python", "PyTorch", "YOLOv8", "OpenCV", "ROS"],
    keyFeatures: [
      "Real-time object detection using YOLOv8",
      "Custom lane segmentation model (U-Net architecture)",
      "Tested across 12 simulated driving scenarios and conditions",
      "28ms average inference time suitable for real-time decisions",
    ],
  },
];