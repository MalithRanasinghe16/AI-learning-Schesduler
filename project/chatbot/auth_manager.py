import jwt
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class AuthManager:
    def __init__(self):
        self.secret_key = os.getenv('JWT_SECRET', 'your-secret-key-change-this')
        self.algorithm = os.getenv('JWT_ALGORITHM', 'HS256')
        self.token_expiry_days = 7
        
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token and return user data"""
        try:
            # Decode the token
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            # Check if token is expired
            if 'exp' in payload:
                exp_timestamp = payload['exp']
                if datetime.utcnow().timestamp() > exp_timestamp:
                    raise jwt.ExpiredSignatureError("Token has expired")
            
            # Extract user information
            user_data = {
                'user_id': payload.get('userId') or payload.get('user_id'),
                'email': payload.get('email'),
                'firstName': payload.get('firstName'),
                'lastName': payload.get('lastName'),
                'iat': payload.get('iat'),
                'exp': payload.get('exp')
            }
            
            if not user_data['user_id']:
                raise jwt.InvalidTokenError("Token missing user ID")
            
            logger.info(f"Token verified successfully for user: {user_data['email']}")
            return user_data
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            raise Exception("Token has expired. Please log in again.")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            raise Exception("Invalid token. Please log in again.")
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            raise Exception("Authentication failed. Please log in again.")
    
    def create_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT token for user (if needed for testing)"""
        try:
            payload = {
                'userId': user_data['user_id'],
                'email': user_data['email'],
                'firstName': user_data.get('firstName', ''),
                'lastName': user_data.get('lastName', ''),
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(days=self.token_expiry_days)
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            logger.info(f"Token created for user: {user_data['email']}")
            return token
            
        except Exception as e:
            logger.error(f"Error creating token: {e}")
            raise Exception("Failed to create authentication token")
    
    def extract_user_id_from_token(self, token: str) -> Optional[str]:
        """Extract user ID from token without full verification (for logging)"""
        try:
            # Decode without verification for logging purposes
            payload = jwt.decode(
                token, 
                options={"verify_signature": False}
            )
            return payload.get('userId') or payload.get('user_id')
        except Exception:
            return None
    
    def is_token_expired(self, token: str) -> bool:
        """Check if token is expired without throwing exceptions"""
        try:
            payload = jwt.decode(
                token, 
                options={"verify_signature": False}
            )
            
            if 'exp' in payload:
                exp_timestamp = payload['exp']
                return datetime.utcnow().timestamp() > exp_timestamp
            
            return False
        except Exception:
            return True
    
    def refresh_token_if_needed(self, token: str) -> Optional[str]:
        """Refresh token if it's close to expiry"""
        try:
            payload = jwt.decode(
                token, 
                options={"verify_signature": False}
            )
            
            if 'exp' in payload:
                exp_timestamp = payload['exp']
                time_until_expiry = exp_timestamp - datetime.utcnow().timestamp()
                
                # Refresh if less than 1 day remaining
                if time_until_expiry < 86400:  # 24 hours in seconds
                    user_data = {
                        'user_id': payload.get('userId') or payload.get('user_id'),
                        'email': payload.get('email'),
                        'firstName': payload.get('firstName', ''),
                        'lastName': payload.get('lastName', '')
                    }
                    return self.create_token(user_data)
            
            return None
        except Exception as e:
            logger.warning(f"Could not refresh token: {e}")
            return None
