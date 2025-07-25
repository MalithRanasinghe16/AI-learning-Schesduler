import re
from typing import Dict, List, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging

logger = logging.getLogger(__name__)

class IntentClassifier:
    def __init__(self):
        self.intents = {
            'create_schedule': {
                'keywords': [
                    'create', 'make', 'generate', 'build', 'new', 'schedule',
                    'plan', 'organize', 'set up', 'arrange', 'start'
                ],
                'patterns': [
                    r'\b(?:create|make|generate|build)\s+.*?schedule\b',
                    r'\bschedule\s+.*?(?:for|today|tomorrow|this week|next week)\b',
                    r'\bplan\s+.*?(?:study|learning|session)\b',
                    r'\bnew\s+schedule\b'
                ],
                'examples': [
                    "create a study schedule for math and physics",
                    "make a schedule for this week",
                    "generate a study plan for tomorrow",
                    "I need a new schedule"
                ]
            },
            'modify_schedule': {
                'keywords': [
                    'change', 'modify', 'update', 'edit', 'alter', 'adjust',
                    'reschedule', 'move', 'shift', 'cancel', 'remove'
                ],
                'patterns': [
                    r'\b(?:change|modify|update|edit)\s+.*?schedule\b',
                    r'\breschedule\s+.*?\b',
                    r'\bmove\s+.*?(?:session|study|class)\b',
                    r'\bcancel\s+.*?\b'
                ],
                'examples': [
                    "change my math session to tomorrow",
                    "reschedule today's study",
                    "modify my schedule",
                    "cancel physics session"
                ]
            },
            'get_schedule': {
                'keywords': [
                    'show', 'display', 'view', 'see', 'get', 'check',
                    'what', 'when', 'schedule', 'today', 'tomorrow', 'list'
                ],
                'patterns': [
                    r'\b(?:show|display|view)\s+.*?schedule\b',
                    r'\bwhat.*?(?:schedule|today|tomorrow)\b',
                    r'\bwhen.*?(?:study|session|class)\b',
                    r'\bcheck\s+.*?schedule\b'
                ],
                'examples': [
                    "show my schedule",
                    "what's my schedule for today",
                    "when is my next study session",
                    "check my schedule"
                ]
            },
            'add_subject': {
                'keywords': [
                    'add', 'include', 'new subject', 'subject', 'course',
                    'class', 'topic'
                ],
                'patterns': [
                    r'\badd\s+.*?(?:subject|course|class)\b',
                    r'\bnew\s+(?:subject|course|class)\b',
                    r'\binclude\s+.*?\b'
                ],
                'examples': [
                    "add a new subject",
                    "include chemistry in my schedule",
                    "new subject: biology"
                ]
            },
            'get_analytics': {
                'keywords': [
                    'analytics', 'progress', 'performance', 'stats', 'statistics',
                    'report', 'how am i doing', 'overview'
                ],
                'patterns': [
                    r'\b(?:analytics|progress|performance|stats)\b',
                    r'\bhow.*?(?:doing|performing|progress)\b',
                    r'\bshow.*?(?:progress|stats|performance)\b'
                ],
                'examples': [
                    "show my progress",
                    "how am I doing",
                    "analytics report",
                    "study statistics"
                ]
            },
            'general_question': {
                'keywords': [
                    'help', 'how', 'what can you do', 'hello', 'hi', 'hey',
                    'thank you', 'thanks', 'bye', 'goodbye', 'capabilities'
                ],
                'patterns': [
                    r'\b(?:hello|hi|hey|good morning|good afternoon)\b',
                    r'\b(?:help|what can you do)\b',
                    r'\b(?:thank you|thanks|bye|goodbye)\b',
                    r'\bhow.*?(?:use|work)\b'
                ],
                'examples': [
                    "hello",
                    "what can you do",
                    "help me",
                    "how does this work"
                ]
            }
        }
        
        # Initialize TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            lowercase=True,
            max_features=1000
        )
        
        # Prepare training data
        self.train_examples = []
        self.train_labels = []
        
        for intent, data in self.intents.items():
            for example in data['examples']:
                self.train_examples.append(example)
                self.train_labels.append(intent)
        
        # Fit vectorizer
        if self.train_examples:
            self.vectorizer.fit(self.train_examples)
            self.train_vectors = self.vectorizer.transform(self.train_examples)
        
        logger.info(f"Intent classifier initialized with {len(self.intents)} intents")
    
    def classify(self, processed_message: Dict[str, Any]) -> Dict[str, Any]:
        """Classify the intent of a processed message"""
        text = processed_message['text']
        entities = processed_message.get('entities', {})
        tokens = processed_message.get('tokens', [])
        
        # Calculate scores for each intent
        intent_scores = {}
        
        for intent_name, intent_data in self.intents.items():
            score = self.calculate_intent_score(
                text, entities, tokens, intent_name, intent_data
            )
            intent_scores[intent_name] = score
        
        # Find the best intent
        best_intent = max(intent_scores.items(), key=lambda x: x[1])
        intent_name, confidence = best_intent
        
        # Apply minimum confidence threshold
        min_confidence = 0.3
        if confidence < min_confidence:
            intent_name = 'general_question'
            confidence = 0.5
        
        return {
            'intent': intent_name,
            'confidence': confidence,
            'all_scores': intent_scores,
            'method': 'hybrid'
        }
    
    def calculate_intent_score(
        self, 
        text: str, 
        entities: Dict[str, Any], 
        tokens: List[Dict[str, Any]], 
        intent_name: str, 
        intent_data: Dict[str, Any]
    ) -> float:
        """Calculate score for a specific intent"""
        
        # 1. Keyword matching score
        keyword_score = self.calculate_keyword_score(text, intent_data['keywords'])
        
        # 2. Pattern matching score
        pattern_score = self.calculate_pattern_score(text, intent_data['patterns'])
        
        # 3. Semantic similarity score
        semantic_score = self.calculate_semantic_score(text, intent_data['examples'])
        
        # 4. Entity-based score
        entity_score = self.calculate_entity_score(entities, intent_name)
        
        # 5. Action verb score
        action_score = self.calculate_action_score(entities.get('actions', []), intent_name)
        
        # Weighted combination
        weights = {
            'keyword': 0.25,
            'pattern': 0.25,
            'semantic': 0.20,
            'entity': 0.15,
            'action': 0.15
        }
        
        total_score = (
            weights['keyword'] * keyword_score +
            weights['pattern'] * pattern_score +
            weights['semantic'] * semantic_score +
            weights['entity'] * entity_score +
            weights['action'] * action_score
        )
        
        return total_score
    
    def calculate_keyword_score(self, text: str, keywords: List[str]) -> float:
        """Calculate score based on keyword matching"""
        text_lower = text.lower()
        matched_keywords = 0
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                matched_keywords += 1
        
        return matched_keywords / len(keywords) if keywords else 0
    
    def calculate_pattern_score(self, text: str, patterns: List[str]) -> float:
        """Calculate score based on regex pattern matching"""
        matched_patterns = 0
        
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                matched_patterns += 1
        
        return matched_patterns / len(patterns) if patterns else 0
    
    def calculate_semantic_score(self, text: str, examples: List[str]) -> float:
        """Calculate semantic similarity score using TF-IDF"""
        if not hasattr(self, 'train_vectors') or not examples:
            return 0
        
        try:
            # Transform input text
            text_vector = self.vectorizer.transform([text])
            
            # Find examples for this intent
            intent_indices = [
                i for i, label in enumerate(self.train_labels) 
                if self.train_examples[i] in examples
            ]
            
            if not intent_indices:
                return 0
            
            # Calculate similarity with intent examples
            intent_vectors = self.train_vectors[intent_indices]
            similarities = cosine_similarity(text_vector, intent_vectors)
            
            return float(np.max(similarities))
            
        except Exception as e:
            logger.warning(f"Error calculating semantic score: {e}")
            return 0
    
    def calculate_entity_score(self, entities: Dict[str, Any], intent_name: str) -> float:
        """Calculate score based on relevant entities for the intent"""
        score = 0
        
        if intent_name == 'create_schedule':
            if entities.get('subjects'):
                score += 0.4
            if entities.get('time_expressions') or entities.get('dates'):
                score += 0.3
            if entities.get('durations'):
                score += 0.3
        
        elif intent_name == 'modify_schedule':
            if entities.get('time_expressions') or entities.get('dates'):
                score += 0.5
            if entities.get('subjects'):
                score += 0.3
            if 'change' in entities.get('actions', []) or 'modify' in entities.get('actions', []):
                score += 0.2
        
        elif intent_name == 'get_schedule':
            if entities.get('time_expressions') or entities.get('dates'):
                score += 0.6
            if 'show' in entities.get('actions', []) or 'get' in entities.get('actions', []):
                score += 0.4
        
        elif intent_name == 'add_subject':
            if entities.get('subjects'):
                score += 0.7
            if 'add' in entities.get('actions', []):
                score += 0.3
        
        return score
    
    def calculate_action_score(self, actions: List[str], intent_name: str) -> float:
        """Calculate score based on action verbs"""
        intent_actions = {
            'create_schedule': ['create', 'make', 'generate', 'build', 'plan', 'schedule'],
            'modify_schedule': ['change', 'modify', 'update', 'edit', 'reschedule', 'move'],
            'get_schedule': ['show', 'display', 'view', 'get', 'check'],
            'add_subject': ['add', 'include'],
            'get_analytics': ['show', 'display', 'view', 'get', 'check'],
            'general_question': []
        }
        
        expected_actions = intent_actions.get(intent_name, [])
        if not expected_actions:
            return 0
        
        matched_actions = len(set(actions) & set(expected_actions))
        return matched_actions / len(expected_actions) if expected_actions else 0
    
    def get_intent_suggestions(self, text: str, top_n: int = 3) -> List[Tuple[str, float]]:
        """Get top N intent suggestions with confidence scores"""
        # Create a dummy processed message for classification
        processed_message = {
            'text': text,
            'entities': {},
            'tokens': []
        }
        
        result = self.classify(processed_message)
        all_scores = result['all_scores']
        
        # Sort by score and return top N
        sorted_intents = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_intents[:top_n]
    
    def add_training_example(self, text: str, intent: str):
        """Add a new training example"""
        if intent in self.intents:
            self.intents[intent]['examples'].append(text)
            self.train_examples.append(text)
            self.train_labels.append(intent)
            
            # Retrain vectorizer
            if self.train_examples:
                self.vectorizer.fit(self.train_examples)
                self.train_vectors = self.vectorizer.transform(self.train_examples)
            
            logger.info(f"Added training example for intent '{intent}': {text}")
        else:
            logger.warning(f"Unknown intent '{intent}' for training example: {text}")
    
    def get_intent_info(self, intent_name: str) -> Dict[str, Any]:
        """Get information about a specific intent"""
        if intent_name in self.intents:
            return self.intents[intent_name]
        return {}
    
    def list_intents(self) -> List[str]:
        """List all available intents"""
        return list(self.intents.keys())
