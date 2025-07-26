"""
Advanced Prioritization Engine for AI Learning Scheduler
Implements Linear Regression, Contextual Multi-Armed Bandit, and RL placeholders
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
import logging
from dataclasses import dataclass, asdict
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os

# For Thompson Sampling Bandit
try:
    import tensorflow_probability as tfp
    TFP_AVAILABLE = True
except ImportError:
    TFP_AVAILABLE = False
    logging.warning("TensorFlow Probability not available. Using numpy-based Thompson Sampling.")

@dataclass
class SubjectFeatures:
    """Features used for prioritization scoring"""
    subject_id: str
    name: str
    difficulty: int  # 1=Beginner, 2=Intermediate, 3=Advanced
    priority: int    # 1=Low, 2=Medium, 3=High
    estimated_hours: float
    completion_rate: float  # 0.0 to 1.0
    focus_score: float     # 1.0 to 10.0
    days_until_deadline: int
    progress_velocity: float  # progress per day
    stress_level: float      # 1.0 to 10.0 (from feedback)
    last_session_success: bool
    
    def to_feature_vector(self) -> np.ndarray:
        """Convert to numerical feature vector for ML models"""
        return np.array([
            self.difficulty,
            self.priority,
            self.estimated_hours,
            self.completion_rate,
            self.focus_score,
            max(1, self.days_until_deadline),  # Avoid division by zero
            self.progress_velocity,
            self.stress_level,
            float(self.last_session_success)
        ])

@dataclass
class SessionFeedback:
    """Feedback data for updating models"""
    subject_id: str
    completion_rate: float
    focus_score: float
    stress_level: float
    session_duration: float
    actual_vs_planned_ratio: float
    timestamp: datetime

class LinearRegressionModel:
    """Linear regression model for subject prioritization scoring"""
    
    def __init__(self):
        self.model = LinearRegression()
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = [
            'difficulty', 'priority', 'estimated_hours', 'completion_rate',
            'focus_score', 'days_until_deadline', 'progress_velocity',
            'stress_level', 'last_session_success'
        ]
        
    def generate_sample_data(self, n_samples: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic training data for initial model training"""
        np.random.seed(42)
        
        # Generate features
        difficulty = np.random.randint(1, 4, n_samples)
        priority = np.random.randint(1, 4, n_samples)
        estimated_hours = np.random.uniform(1, 20, n_samples)
        completion_rate = np.random.beta(2, 2, n_samples)  # Beta distribution for rates
        focus_score = np.random.normal(6, 2, n_samples)
        focus_score = np.clip(focus_score, 1, 10)
        days_until_deadline = np.random.randint(1, 30, n_samples)
        progress_velocity = np.random.exponential(0.1, n_samples)
        stress_level = np.random.normal(5, 2, n_samples)
        stress_level = np.clip(stress_level, 1, 10)
        last_session_success = np.random.binomial(1, 0.6, n_samples)
        
        X = np.column_stack([
            difficulty, priority, estimated_hours, completion_rate,
            focus_score, days_until_deadline, progress_velocity,
            stress_level, last_session_success
        ])
        
        # Generate target scores based on realistic priorities
        y = (
            priority * 2.0 +                           # High priority = higher score
            (4 - difficulty) * 1.5 +                  # Higher difficulty = lower score (inverted)
            completion_rate * 3.0 +                   # Higher completion = higher score
            focus_score * 0.5 +                       # Higher focus = higher score
            (31 - days_until_deadline) * 0.1 +        # Closer deadline = higher score
            progress_velocity * 2.0 +                 # Faster progress = higher score
            (11 - stress_level) * 0.3 +               # Lower stress = higher score (inverted)
            last_session_success * 1.0 +              # Recent success = higher score
            np.random.normal(0, 0.5, n_samples)       # Add some noise
        )
        
        # Normalize scores to 0-100 range
        y = np.clip(y, 0, 100)
        
        return X, y
    
    def train(self, X: Optional[np.ndarray] = None, y: Optional[np.ndarray] = None):
        """Train the linear regression model"""
        if X is None or y is None:
            logging.info("No training data provided. Generating sample data...")
            X, y = self.generate_sample_data()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        logging.info(f"Linear Regression - Train R²: {train_score:.3f}, Test R²: {test_score:.3f}")
        
        self.is_trained = True
    
    def predict_priority_score(self, subject_features: SubjectFeatures) -> float:
        """Predict priority score for a subject"""
        if not self.is_trained:
            self.train()
        
        feature_vector = subject_features.to_feature_vector().reshape(1, -1)
        scaled_features = self.scaler.transform(feature_vector)
        score = self.model.predict(scaled_features)[0]
        
        return max(0, min(100, score))  # Clip to valid range
    
    def save_model(self, filepath: str):
        """Save trained model to disk"""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names
        }
        joblib.dump(model_data, filepath)
        logging.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from disk"""
        if os.path.exists(filepath):
            try:
                model_data = joblib.load(filepath)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.feature_names = model_data['feature_names']
                self.is_trained = True
                logging.info(f"Model loaded from {filepath}")
            except Exception as e:
                logging.error(f"Error loading model from {filepath}: {e}")
                logging.info("Training new model with synthetic data...")
                self.train()
        else:
            logging.warning(f"Model file {filepath} not found. Training new model...")
            self.train()

class ContextualMultiArmedBandit:
    """Thompson Sampling-based contextual bandit for subject selection"""
    
    def __init__(self, n_features: int = 9, alpha: float = 1.0, beta: float = 1.0):
        self.n_features = n_features
        self.alpha = alpha  # Prior for success
        self.beta = beta    # Prior for failure
        self.arms = {}      # subject_id -> arm data
        
    def add_arm(self, subject_id: str):
        """Add a new arm (subject) to the bandit"""
        if subject_id not in self.arms:
            self.arms[subject_id] = {
                'successes': self.alpha,
                'failures': self.beta,
                'total_pulls': 0,
                'rewards': [],
                'contexts': []
            }
    
    def get_thompson_sample(self, subject_id: str) -> float:
        """Get Thompson sample for a subject"""
        if subject_id not in self.arms:
            self.add_arm(subject_id)
        
        arm = self.arms[subject_id]
        
        if TFP_AVAILABLE:
            # Use TensorFlow Probability for more accurate sampling
            beta_dist = tfp.distributions.Beta(arm['successes'], arm['failures'])
            sample = float(beta_dist.sample())
        else:
            # Fallback to numpy
            sample = np.random.beta(arm['successes'], arm['failures'])
        
        return sample
    
    def select_arm(self, available_subjects: List[str], 
                   context_features: Optional[Dict[str, SubjectFeatures]] = None) -> str:
        """Select the best arm using Thompson Sampling"""
        if not available_subjects:
            raise ValueError("No subjects available for selection")
        
        # Ensure all subjects are added as arms
        for subject_id in available_subjects:
            self.add_arm(subject_id)
        
        # Get Thompson samples for all subjects
        samples = {}
        for subject_id in available_subjects:
            samples[subject_id] = self.get_thompson_sample(subject_id)
        
        # Select subject with highest sample
        selected_subject = max(samples, key=samples.get)
        
        # Record the pull
        self.arms[selected_subject]['total_pulls'] += 1
        
        logging.info(f"Bandit selected: {selected_subject} (sample: {samples[selected_subject]:.3f})")
        
        return selected_subject
    
    def update_reward(self, subject_id: str, feedback: SessionFeedback):
        """Update arm rewards based on session feedback"""
        if subject_id not in self.arms:
            self.add_arm(subject_id)
        
        arm = self.arms[subject_id]
        
        # Calculate reward based on multiple factors
        reward = self._calculate_reward(feedback)
        
        # Update Beta distribution parameters
        if reward > 0.5:  # Success threshold
            arm['successes'] += reward
        else:
            arm['failures'] += (1 - reward)
        
        arm['rewards'].append(reward)
        arm['contexts'].append(asdict(feedback))
        
        logging.info(f"Updated bandit reward for {subject_id}: {reward:.3f}")
    
    def _calculate_reward(self, feedback: SessionFeedback) -> float:
        """Calculate reward from session feedback"""
        # Weighted combination of feedback metrics
        reward = (
            feedback.completion_rate * 0.4 +           # 40% weight on completion
            (feedback.focus_score / 10.0) * 0.3 +      # 30% weight on focus
            ((11 - feedback.stress_level) / 10.0) * 0.2 +  # 20% weight on low stress
            (feedback.actual_vs_planned_ratio) * 0.1   # 10% weight on timing accuracy
        )
        
        return np.clip(reward, 0.0, 1.0)
    
    def get_arm_statistics(self, subject_id: str) -> Dict[str, Any]:
        """Get statistics for a specific arm"""
        if subject_id not in self.arms:
            return {}
        
        arm = self.arms[subject_id]
        
        return {
            'total_pulls': arm['total_pulls'],
            'success_rate': arm['successes'] / (arm['successes'] + arm['failures']),
            'average_reward': np.mean(arm['rewards']) if arm['rewards'] else 0.0,
            'confidence_interval': self._get_confidence_interval(subject_id)
        }
    
    def _get_confidence_interval(self, subject_id: str, confidence: float = 0.95) -> Tuple[float, float]:
        """Calculate confidence interval for success rate"""
        if subject_id not in self.arms:
            return (0.0, 1.0)
        
        arm = self.arms[subject_id]
        
        if TFP_AVAILABLE:
            beta_dist = tfp.distributions.Beta(arm['successes'], arm['failures'])
            lower = float(beta_dist.quantile((1 - confidence) / 2))
            upper = float(beta_dist.quantile(1 - (1 - confidence) / 2))
        else:
            # Approximate using normal distribution
            mean = arm['successes'] / (arm['successes'] + arm['failures'])
            var = (arm['successes'] * arm['failures']) / ((arm['successes'] + arm['failures'])**2 * (arm['successes'] + arm['failures'] + 1))
            std = np.sqrt(var)
            z_score = 1.96  # 95% confidence
            lower = max(0.0, mean - z_score * std)
            upper = min(1.0, mean + z_score * std)
        
        return (lower, upper)

class ReinforcementLearningPlaceholder:
    """Placeholder for future TensorFlow.js RL model integration"""
    
    def __init__(self, backend_url: str = "http://localhost:5000"):
        self.backend_url = backend_url
        self.is_enabled = False
        
    async def initialize_rl_model(self):
        """Initialize RL model in Node.js backend (future implementation)"""
        # Placeholder for TF.js model initialization
        logging.info("RL Model initialization placeholder - will integrate with TF.js in Node.js backend")
        
        # Future implementation will:
        # 1. Call Node.js API to initialize TF.js model
        # 2. Load pre-trained embeddings (Universal Sentence Encoder)
        # 3. Set up Q-learning or DQN architecture
        # 4. Define reward function balancing deadlines, difficulty, performance
        
        return {
            "status": "placeholder",
            "model_type": "DQN",
            "features": ["subject_embeddings", "temporal_features", "user_performance"],
            "reward_function": "deadline_difficulty_performance_balance"
        }
    
    async def get_rl_recommendation(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Get recommendation from RL model (future implementation)"""
        # Placeholder - will call Node.js backend TF.js model
        return {
            "recommended_subject": None,
            "confidence": 0.0,
            "reasoning": "RL model not yet implemented - using bandit fallback",
            "model_used": "placeholder"
        }
    
    async def update_rl_model(self, state: Dict[str, Any], action: str, reward: float, next_state: Dict[str, Any]):
        """Update RL model with new experience (future implementation)"""
        # Placeholder for experience replay and model updates
        logging.info(f"RL model update placeholder - action: {action}, reward: {reward}")

class PrioritizationEngine:
    """Main prioritization engine combining all models"""
    
    def __init__(self, model_save_path: str = "models/"):
        self.model_save_path = model_save_path
        os.makedirs(model_save_path, exist_ok=True)
        
        # Initialize models
        self.linear_model = LinearRegressionModel()
        self.bandit = ContextualMultiArmedBandit()
        self.rl_placeholder = ReinforcementLearningPlaceholder()
        
        # Load or train models
        self._initialize_models()
        
    def _initialize_models(self):
        """Initialize all models"""
        try:
            # Load or train linear regression model
            model_path = os.path.join(self.model_save_path, "linear_regression_model.pkl")
            
            # Check if model file exists and try to load it
            if os.path.exists(model_path):
                try:
                    self.linear_model.load_model(model_path)
                    logging.info("Loaded existing linear regression model")
                except Exception as e:
                    logging.warning(f"Could not load existing model ({e}), training new one")
                    self.linear_model.train()
                    self.linear_model.save_model(model_path)
            else:
                logging.info("No existing model found, training new linear regression model")
                self.linear_model.train()
                
            # Save initial model if it was trained
            if self.linear_model.is_trained:
                self.linear_model.save_model(model_path)
                
        except Exception as e:
            logging.error(f"Error initializing models: {e}")
            # Create fallback - reinitialize model
            self.linear_model = LinearRegressionModel()
            self.linear_model.train()
    
    def get_priority_scores(self, subjects: List[SubjectFeatures]) -> List[Tuple[str, float, str]]:
        """Get priority scores for all subjects using multiple models"""
        scores = []
        
        for subject in subjects:
            # Linear regression score
            lr_score = self.linear_model.predict_priority_score(subject)
            
            # Bandit exploration bonus
            bandit_stats = self.bandit.get_arm_statistics(subject.subject_id)
            exploration_bonus = self._calculate_exploration_bonus(bandit_stats)
            
            # Combined score
            final_score = lr_score + exploration_bonus
            
            scores.append((subject.subject_id, final_score, "linear_regression + bandit"))
        
        # Sort by score (descending)
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores
    
    def _calculate_exploration_bonus(self, bandit_stats: Dict[str, Any]) -> float:
        """Calculate exploration bonus based on uncertainty"""
        if not bandit_stats or bandit_stats.get('total_pulls', 0) == 0:
            return 10.0  # High bonus for unexplored subjects
        
        # UCB-style exploration bonus
        total_pulls = bandit_stats['total_pulls']
        confidence_width = bandit_stats['confidence_interval'][1] - bandit_stats['confidence_interval'][0]
        
        exploration_bonus = confidence_width * 5.0 + (1.0 / np.sqrt(total_pulls + 1)) * 3.0
        
        return min(exploration_bonus, 15.0)  # Cap bonus
    
    def select_optimal_subject(self, available_subjects: List[SubjectFeatures]) -> Tuple[str, float, str]:
        """Select the optimal subject for the next study session"""
        if not available_subjects:
            raise ValueError("No subjects available")
        
        # Get priority scores
        scores = self.get_priority_scores(available_subjects)
        
        # Use bandit for final selection among top candidates
        top_subjects = [s[0] for s in scores[:min(3, len(scores))]]  # Top 3 candidates
        
        selected_subject = self.bandit.select_arm(top_subjects)
        selected_score = next(s[1] for s in scores if s[0] == selected_subject)
        
        return selected_subject, selected_score, "hybrid_bandit_selection"
    
    def update_models(self, feedback: SessionFeedback):
        """Update all models with session feedback"""
        # Update bandit
        self.bandit.update_reward(feedback.subject_id, feedback)
        
        # TODO: Retrain linear model periodically with new data
        # TODO: Update RL model when implemented
        
        logging.info(f"Models updated with feedback for subject {feedback.subject_id}")
    
    def get_scheduling_recommendations(self, subjects: List[SubjectFeatures], 
                                     time_slots: int = 5) -> List[Dict[str, Any]]:
        """Generate scheduling recommendations for multiple time slots"""
        recommendations = []
        available_subjects = subjects.copy()
        
        for slot in range(min(time_slots, len(subjects))):
            if not available_subjects:
                break
            
            subject_id, score, method = self.select_optimal_subject(available_subjects)
            
            # Find the selected subject
            selected_subject = next(s for s in available_subjects if s.subject_id == subject_id)
            
            recommendations.append({
                'time_slot': slot + 1,
                'subject_id': subject_id,
                'subject_name': selected_subject.name,
                'priority_score': score,
                'method_used': method,
                'estimated_duration': selected_subject.estimated_hours * 60,  # Convert to minutes
                'reasoning': self._generate_reasoning(selected_subject, score)
            })
            
            # Remove selected subject from available list
            available_subjects = [s for s in available_subjects if s.subject_id != subject_id]
        
        return recommendations
    
    def _generate_reasoning(self, subject: SubjectFeatures, score: float) -> str:
        """Generate human-readable reasoning for selection"""
        reasons = []
        
        if subject.priority >= 3:
            reasons.append("high priority")
        if subject.days_until_deadline <= 3:
            reasons.append("approaching deadline")
        if subject.completion_rate < 0.3:
            reasons.append("needs attention")
        if subject.focus_score >= 8:
            reasons.append("good focus history")
        if subject.stress_level <= 3:
            reasons.append("low stress subject")
        
        if not reasons:
            reasons.append("balanced metrics")
        
        return f"Selected due to: {', '.join(reasons)} (score: {score:.1f})"

# Initialize global prioritization engine
prioritization_engine = PrioritizationEngine()

# Export for use in main chatbot
__all__ = [
    'PrioritizationEngine', 
    'SubjectFeatures', 
    'SessionFeedback',
    'prioritization_engine'
]
