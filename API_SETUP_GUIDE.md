# API & Model Setup Guide

This guide explains how to set up API keys for cloud AI services and configure local models using Ollama for RoundAIble.

## 🤖 Cloud AI Services Setup

### **OpenAI API Setup**

1. **Create Account**
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Sign up for an account
   - Complete email verification

2. **Generate API Key**
   - Go to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Give it a descriptive name (e.g., "RoundAIble")
   - Copy the generated key immediately (you won't see it again)

3. **Add to RoundAIble**
   - Open RoundAIble application
   - Go to Settings → API Configuration
   - Paste your OpenAI API key
   - Save the configuration

**Supported Models**: GPT-4, GPT-3.5-turbo, GPT-4o

**Cost**: Pay-per-use pricing based on token usage

---

### **Anthropic Claude Setup**

1. **Create Account**
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Sign up for an account
   - Verify your email address

2. **Generate API Key**
   - Navigate to API Keys section
   - Click "Create Key"
   - Name your key (e.g., "RoundAIble Claude")
   - Copy the generated key

3. **Add to RoundAIble**
   - Open RoundAIble application
   - Go to Settings → API Configuration
   - Paste your Anthropic API key
   - Save the configuration

**Supported Models**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku, Claude 2

**Cost**: Pay-per-use pricing based on input/output tokens

---

### **Google Gemini Setup**

1. **Create Account**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Sign in with your Google account
   - Accept terms of service

2. **Generate API Key**
   - Click on "Get API key" in the top right
   - Choose "Create API key in new project" or existing project
   - Copy the generated API key

3. **Add to RoundAIble**
   - Open RoundAIble application
   - Go to Settings → API Configuration
   - Paste your Google API key
   - Save the configuration

**Supported Models**: Gemini Pro, Gemini Flash, Gemini Pro Vision

**Cost**: Free tier available, then pay-per-use pricing

---

### **HuggingFace Setup**

1. **Create Account**
   - Visit [HuggingFace](https://huggingface.co/)
   - Sign up for a free account
   - Complete your profile

2. **Generate Access Token**
   - Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
   - Click "New token"
   - Give it a name (e.g., "RoundAIble")
   - Select "Read" role for inference
   - Copy the generated token

3. **Add to RoundAIble**
   - Open RoundAIble application
   - Go to Settings → API Configuration
   - Paste your HuggingFace token
   - Save the configuration

**Supported Models**: Thousands of open-source models
**Cost**: Free for most models, some premium models require subscription

---

## 🏠 Local Models with Ollama

### **What is Ollama?**

Ollama is an open-source framework that allows you to run large language models locally on your machine. It provides a simple way to download, run, and manage AI models without requiring cloud services.

### **Benefits of Local Models**

- **Privacy**: Your code and prompts stay on your local machine
- **Cost-Effective**: No API costs for model usage
- **Offline Capability**: Work without internet connection
- **Customization**: Fine-tune models for specific tasks
- **Performance**: Lower latency for local processing

### **Installation**

#### **Windows**
1. Download the installer from [Ollama Downloads](https://ollama.ai/download)
2. Run the installer and follow the setup wizard
3. Restart your computer if prompted
4. Open Command Prompt or PowerShell and verify installation:
   ```bash
   ollama --version
   ```

#### **macOS**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### **Linux (Ubuntu/Debian)**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### **Downloading Models**

Once Ollama is installed, you can download models using the command line:

```bash
# Download a coding model
ollama pull codellama:7b

# Download a general-purpose model
ollama pull llama2:7b

# Download a specialized model
ollama pull deepseek-coder:6.7b

# Download a larger, more capable model
ollama pull codellama:13b
```

### **Recommended Models for Coding**

| Model | Size | Best For | RAM Required |
|-------|------|----------|--------------|
| `codellama:7b` | 7B | General coding tasks | 8GB |
| `deepseek-coder:6.7b` | 6.7B | Code generation | 8GB |
| `wizardcoder:7b` | 7B | Programming assistance | 8GB |
| `phind-codellama:7b` | 7B | Code analysis | 8GB |
| `codellama:13b` | 13B | Advanced coding | 16GB |
| `llama2:7b` | 7B | General tasks | 8GB |

### **Testing Your Models**

Test if a model is working correctly:

```bash
# Test CodeLlama
ollama run codellama:7b "Write a Python function to calculate fibonacci numbers"

# Test general model
ollama run llama2:7b "Explain what is machine learning"
```

### **Configuring in RoundAIble**

1. **Open RoundAIble**
   - Launch the application
   - Go to the workflow editor

2. **Add Local Node**
   - Drag a "Local Reasoning" or "Local Critic" node to the canvas
   - Double-click to configure

3. **Select Model**
   - Choose your preferred Ollama model from the dropdown
   - The dropdown will show all models you've downloaded

4. **Configure Parameters**
   - **Temperature**: Controls randomness (0.0 = deterministic, 1.0 = very random)
   - **Max Tokens**: Maximum length of generated response
   - **Top P**: Controls diversity of responses

5. **Connect to Workflow**
   - Connect the local node to other nodes in your workflow
   - Test the connection by running a simple workflow

### **Performance Optimization**

#### **Hardware Requirements**
- **Minimum**: 8GB RAM, 4-core CPU
- **Recommended**: 16GB+ RAM, 8-core CPU, GPU with CUDA support

#### **GPU Acceleration**
If you have an NVIDIA GPU:

1. **Install CUDA Toolkit**
   - Download from [NVIDIA CUDA](https://developer.nvidia.com/cuda-downloads)
   - Follow installation instructions

2. **Install Ollama with GPU Support**
   ```bash
   # Reinstall Ollama with GPU support
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

3. **Verify GPU Usage**
   ```bash
   # Check if GPU is being used
   ollama run codellama:7b "Test" --verbose
   ```

#### **Memory Management**
- Close unnecessary applications when running large models
- Use smaller models (7B) for faster response times
- Consider using quantized models for better performance

### **Troubleshooting**

#### **Ollama Not Starting**
```bash
# Check if Ollama service is running
ollama list

# Start Ollama service
ollama serve

# Check logs for errors
ollama logs
```

#### **Model Download Issues**
```bash
# Check available models
ollama list

# Remove corrupted model
ollama rm codellama:7b

# Re-download model
ollama pull codellama:7b
```

#### **Performance Issues**
- Ensure sufficient RAM (8GB+ for 7B models)
- Close other memory-intensive applications
- Use smaller models for faster response times
- Consider GPU acceleration if available

#### **Connection Issues in RoundAIble**
- Verify Ollama is running: `ollama list`
- Check if the model name matches exactly
- Restart RoundAIble application
- Check firewall settings

### **Advanced Configuration**

#### **Custom Model Parameters**
You can create custom model configurations:

```bash
# Create a custom model with specific parameters
ollama create my-coder -f Modelfile
```

Example Modelfile:
```
FROM codellama:7b
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
```

#### **Model Quantization**
For better performance on limited hardware:

```bash
# Download quantized version
ollama pull codellama:7b-q4_0

# Or quantize existing model
ollama quantize codellama:7b
```

---

## 🔧 Environment Configuration

### **Backend Configuration**

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Keys (optional for local models)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here
HUGGINGFACE_API_KEY=your_hf_token_here

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
```

### **Security Best Practices**

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables for sensitive data
   - Rotate API keys regularly
   - Monitor API usage for unexpected charges

2. **Local Model Security**
   - Keep Ollama updated to latest version
   - Only download models from trusted sources
   - Monitor system resources when running models
   - Use firewall to restrict network access if needed

---

## 📞 Getting Help

If you encounter issues with API setup or local models:

1. **Check Documentation**
   - Review this guide thoroughly
   - Check console for error messages
   - Verify all prerequisites are met

2. **Common Solutions**
   - Restart the application
   - Verify internet connectivity for cloud APIs
   - Check if Ollama service is running
   - Ensure sufficient system resources

3. **Contact Support**
   - Email: navidmoradimehr2@gmail.com
   - Include detailed error messages
   - Specify your operating system and hardware
   - Describe the exact steps that led to the issue

---

*This guide covers the essential setup for both cloud AI services and local models. For advanced configuration options, refer to the official documentation of each service.* 