from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import boto3
import json
import base64
from botocore.exceptions import ClientError
import subprocess
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

def update_aws_credentials(account: str, role: str):
    """Update AWS credentials using ada command"""
    try:
        cmd = f"ada credentials update --account={account} --provider=conduit --role={role} --once"
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"Credentials updated successfully: {result.stdout}")
        time.sleep(2)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error updating credentials: {e}")
        print(f"Command output: {e.stdout}")
        print(f"Command error: {e.stderr}")
        return False
    except Exception as e:
        print(f"Unexpected error updating credentials: {e}")
        return False

def get_bedrock_client(region='us-east-1'):
    """Get Bedrock client with proper error handling"""
    try:
        session = boto3.Session(
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('AWS_SESSION_TOKEN'),
            region_name=region
        )
        return session.client('bedrock-runtime')
    except Exception as e:
        print(f"Error creating Bedrock client: {e}")
        raise

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        # Validate request data
        if not request.json:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        data = request.json
        
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Extract base64 image data
        base64_image = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        question = data.get('question', 'What do you see in this image?')
        
        print(f"Processing question: {question}")
        
        # Try to update AWS credentials (optional - may not be needed in all environments)
        # credentials_updated = update_aws_credentials('********', 'IibsAdminAccess-DO-NOT-DELETE')
        if not credentials_updated:
            print("Warning: Could not update AWS credentials via ada command. Proceeding with existing credentials.")
        
        # Create Bedrock client
        bedrock_client = get_bedrock_client('us-east-1')
        
        # Construct prompt
        prompt = f"Answer the following question from a blind/disability person in 4 to 5 sentences about the following image. Just answer the question directly without mentioning what you are or how you work: {question}"
        
        # Prepare payload for Claude
        payload = {
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }],
            "max_tokens": 10000,
            "anthropic_version": "bedrock-2023-05-31"
        }
        
        # Call Bedrock API
        response = bedrock_client.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            contentType="application/json",
            body=json.dumps(payload)
        )
        
        # Parse response
        output = json.loads(response["body"].read())
        description = output["content"][0]["text"]
        
        print(f"Generated description: {description}")
        
        return jsonify({
            'description': description,
            'status': 'success'
        })

    except ClientError as e:
        error_msg = f"AWS API error: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500
    
    except KeyError as e:
        error_msg = f"Missing required field: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 400
    
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON in response: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500
    
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500

if __name__ == '__main__':
    print("Starting WorkSight Image Analyzer Server...")
    print("Server will run on http://localhost:5059")
    print("Health check available at http://localhost:5059/health")
    app.run(host='0.0.0.0', port=5059, debug=True)