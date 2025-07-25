import spacy
import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from dateutil.parser import parse as date_parse

logger = logging.getLogger(__name__)

class NLPProcessor:
    def __init__(self):
        self.nlp = None
        self.load_model()
        
        # Define patterns for common entities
        self.time_patterns = [
            r'\b(?:today|tomorrow|yesterday)\b',
            r'\b(?:this|next|last)\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(?:morning|afternoon|evening|night)\b',
            r'\b(?:\d{1,2}:\d{2}(?:\s*(?:am|pm))?)\b',
            r'\b(?:\d{1,2}\s*(?:am|pm))\b',
            r'\b(?:in\s+)?\d+\s+(?:hours?|minutes?|days?|weeks?)\b'
        ]
        
        self.duration_patterns = [
            r'\b(?:\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b',
            r'\b(?:\d+)\s*(?:minutes?|mins?|m)\b',
            r'\b(?:for|during)\s+(?:\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b'
        ]
        
        self.subject_indicators = [
            r'\b(?:math|mathematics|calculus|algebra|geometry|statistics)\b',
            r'\b(?:physics|chemistry|biology|science)\b',
            r'\b(?:english|literature|writing|reading)\b',
            r'\b(?:history|geography|social studies)\b',
            r'\b(?:computer science|programming|coding|cs)\b',
            r'\b(?:spanish|french|german|language)\b'
        ]
        
    def load_model(self):
        """Load spaCy model"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded successfully")
        except IOError:
            logger.warning("spaCy model not found, downloading...")
            try:
                spacy.cli.download("en_core_web_sm")
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy model downloaded and loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load spaCy model: {e}")
                self.nlp = None
    
    def is_ready(self) -> bool:
        """Check if NLP processor is ready"""
        return self.nlp is not None
    
    def process(self, text: str) -> Dict[str, Any]:
        """Process text and extract entities and information"""
        if not self.nlp:
            logger.error("NLP model not available")
            return {
                'text': text,
                'entities': {},
                'tokens': [],
                'processed': False
            }
        
        # Clean and normalize text
        cleaned_text = self.clean_text(text)
        
        # Process with spaCy
        doc = self.nlp(cleaned_text)
        
        # Extract entities
        entities = self.extract_entities(cleaned_text, doc)
        
        # Extract tokens and their properties
        tokens = [
            {
                'text': token.text,
                'lemma': token.lemma_,
                'pos': token.pos_,
                'tag': token.tag_,
                'is_stop': token.is_stop,
                'is_alpha': token.is_alpha
            }
            for token in doc
        ]
        
        return {
            'text': cleaned_text,
            'entities': entities,
            'tokens': tokens,
            'processed': True,
            'doc': doc  # Keep for further processing if needed
        }
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize input text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Normalize common abbreviations
        text = re.sub(r'\bmath\b', 'mathematics', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcs\b', 'computer science', text, flags=re.IGNORECASE)
        text = re.sub(r'\bhrs?\b', 'hours', text, flags=re.IGNORECASE)
        text = re.sub(r'\bmins?\b', 'minutes', text, flags=re.IGNORECASE)
        
        return text
    
    def extract_entities(self, text: str, doc) -> Dict[str, Any]:
        """Extract entities from processed text"""
        entities = {
            'subjects': [],
            'time_expressions': [],
            'durations': [],
            'numbers': [],
            'actions': [],
            'dates': []
        }
        
        # Extract spaCy named entities
        for ent in doc.ents:
            if ent.label_ in ['DATE', 'TIME']:
                entities['time_expressions'].append({
                    'text': ent.text,
                    'label': ent.label_,
                    'start': ent.start_char,
                    'end': ent.end_char
                })
        
        # Extract subjects using patterns
        entities['subjects'] = self.extract_subjects(text)
        
        # Extract time expressions
        entities['time_expressions'].extend(self.extract_time_expressions(text))
        
        # Extract durations
        entities['durations'] = self.extract_durations(text)
        
        # Extract numbers
        entities['numbers'] = self.extract_numbers(doc)
        
        # Extract action verbs
        entities['actions'] = self.extract_actions(doc)
        
        # Extract and parse dates
        entities['dates'] = self.extract_dates(text)
        
        return entities
    
    def extract_subjects(self, text: str) -> List[str]:
        """Extract subject names from text"""
        subjects = []
        text_lower = text.lower()
        
        # Use predefined patterns
        for pattern in self.subject_indicators:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            subjects.extend(matches)
        
        # Look for quoted subjects or subjects after "in" or "for"
        quoted_subjects = re.findall(r'"([^"]*)"', text)
        subjects.extend(quoted_subjects)
        
        # Look for subjects after specific keywords
        subject_keywords = r'\b(?:study|learn|review|practice|work on|focus on)\s+([A-Za-z\s]+?)(?:\s+(?:for|today|tomorrow|this week|next week)|\.|$)'
        keyword_subjects = re.findall(subject_keywords, text, re.IGNORECASE)
        subjects.extend([s.strip() for s in keyword_subjects if s.strip()])
        
        # Remove duplicates and clean
        subjects = list(set([s.strip().lower() for s in subjects if s.strip()]))
        
        return subjects
    
    def extract_time_expressions(self, text: str) -> List[Dict[str, Any]]:
        """Extract time expressions from text"""
        time_expressions = []
        
        for pattern in self.time_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                time_expressions.append({
                    'text': match.group(),
                    'start': match.start(),
                    'end': match.end(),
                    'type': 'time_expression'
                })
        
        return time_expressions
    
    def extract_durations(self, text: str) -> List[Dict[str, Any]]:
        """Extract duration expressions from text"""
        durations = []
        
        for pattern in self.duration_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                duration_text = match.group()
                duration_minutes = self.parse_duration_to_minutes(duration_text)
                
                durations.append({
                    'text': duration_text,
                    'minutes': duration_minutes,
                    'start': match.start(),
                    'end': match.end()
                })
        
        return durations
    
    def extract_numbers(self, doc) -> List[Dict[str, Any]]:
        """Extract numbers from text"""
        numbers = []
        
        for token in doc:
            if token.like_num or token.pos_ == 'NUM':
                try:
                    value = float(token.text)
                    numbers.append({
                        'text': token.text,
                        'value': value,
                        'start': token.idx,
                        'end': token.idx + len(token.text)
                    })
                except ValueError:
                    pass
        
        return numbers
    
    def extract_actions(self, doc) -> List[str]:
        """Extract action verbs from text"""
        actions = []
        
        action_verbs = [
            'create', 'make', 'schedule', 'plan', 'add', 'remove', 'delete',
            'modify', 'change', 'update', 'show', 'display', 'view', 'get',
            'study', 'learn', 'review', 'practice', 'work', 'focus'
        ]
        
        for token in doc:
            if token.lemma_.lower() in action_verbs and token.pos_ == 'VERB':
                actions.append(token.lemma_.lower())
        
        return list(set(actions))
    
    def extract_dates(self, text: str) -> List[Dict[str, Any]]:
        """Extract and parse dates from text"""
        dates = []
        
        # Common date patterns
        date_patterns = [
            r'\b(?:today|tomorrow|yesterday)\b',
            r'\b(?:this|next|last)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(?:this|next|last)\s+(?:week|month)\b',
            r'\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',
            r'\b\d{1,2}-\d{1,2}-\d{2,4}\b',
            r'\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b'
        ]
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                date_text = match.group()
                parsed_date = self.parse_date(date_text)
                
                dates.append({
                    'text': date_text,
                    'parsed_date': parsed_date,
                    'start': match.start(),
                    'end': match.end()
                })
        
        return dates
    
    def parse_duration_to_minutes(self, duration_text: str) -> int:
        """Convert duration text to minutes"""
        duration_text = duration_text.lower()
        
        # Extract hours
        hour_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)', duration_text)
        hours = float(hour_match.group(1)) if hour_match else 0
        
        # Extract minutes
        minute_match = re.search(r'(\d+)\s*(?:minutes?|mins?|m)', duration_text)
        minutes = float(minute_match.group(1)) if minute_match else 0
        
        return int(hours * 60 + minutes)
    
    def parse_date(self, date_text: str) -> Optional[datetime]:
        """Parse date text to datetime object"""
        try:
            now = datetime.now()
            date_text = date_text.lower().strip()
            
            if date_text == 'today':
                return now.date()
            elif date_text == 'tomorrow':
                return (now + timedelta(days=1)).date()
            elif date_text == 'yesterday':
                return (now - timedelta(days=1)).date()
            elif 'this week' in date_text:
                return now.date()
            elif 'next week' in date_text:
                return (now + timedelta(weeks=1)).date()
            elif 'last week' in date_text:
                return (now - timedelta(weeks=1)).date()
            else:
                # Try to parse with dateutil
                return date_parse(date_text, fuzzy=True).date()
                
        except Exception as e:
            logger.warning(f"Could not parse date '{date_text}': {e}")
            return None
    
    def get_intent_keywords(self) -> Dict[str, List[str]]:
        """Get keywords associated with different intents"""
        return {
            'create_schedule': [
                'create', 'make', 'generate', 'build', 'new', 'schedule',
                'plan', 'organize', 'set up', 'arrange'
            ],
            'modify_schedule': [
                'change', 'modify', 'update', 'edit', 'alter', 'adjust',
                'reschedule', 'move', 'shift', 'cancel'
            ],
            'get_schedule': [
                'show', 'display', 'view', 'see', 'get', 'check',
                'what', 'when', 'schedule', 'today', 'tomorrow'
            ],
            'add_subject': [
                'add', 'include', 'new subject', 'subject'
            ],
            'general_question': [
                'help', 'how', 'what can you do', 'hello', 'hi',
                'thank you', 'thanks', 'bye', 'goodbye'
            ]
        }
