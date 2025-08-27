# RoundAIble Web

**AI-Powered Multi-Agent Code Generation and Collaborative Reasoning**

RoundAIble Web is a sophisticated web application that enables competitive code generation through multiple AI agents, intelligent critique systems, and real-time workflow management. Built with React, Node.js, and modern web technologies for seamless browser-based experience.

## 🚀 Key Features

### **Multi-Agent Code Generation**
- **Competitive AI Agents**: Multiple AI models compete to generate the best code solutions
- **Diverse Model Support**: OpenAI GPT models, Anthropic Claude, Google Gemini, HuggingFace models, and local Ollama models
- **Parallel Processing**: Agents work simultaneously to provide multiple solutions
- **Code Quality Assessment**: Automated scoring and ranking of generated code

### **Intelligent Critique System**
- **Automated Code Review**: AI-powered critics analyze and score generated code
- **Detailed Feedback**: Comprehensive analysis with suggestions for improvement
- **Multiple Critique Perspectives**: Different AI models provide varied viewpoints
- **Scoring Algorithm**: Sophisticated scoring system to determine the best solution

### **Visual Workflow Editor**
- **Drag-and-Drop Interface**: Intuitive node-based workflow design
- **Real-time Connection**: Connect different components with visual links
- **Multi-Node Support**: Input nodes, reasoning agents, critics, and output nodes
- **Workflow Management**: Save, load, and manage multiple workflow configurations

### **Modern Web Application**
- **Browser-Based**: Access from any device with a modern web browser
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Collaboration**: Share workflows and collaborate with team members
- **Secure Architecture**: Built with modern web security standards

## 🏗️ How It Works

### **1. Workflow Design**
Users create workflows by connecting different node types:
- **Input Node**: Defines the coding task (new code, modifications, bug fixes)
- **Reasoning Agents**: AI models that generate code solutions
- **Critic Nodes**: AI models that evaluate and score the generated code
- **RoundAIble Node**: Central orchestrator that manages the competition

### **2. Code Generation Process**
1. **Task Definition**: User specifies requirements in the input node
2. **Agent Competition**: Multiple AI agents generate code simultaneously
3. **Code Analysis**: Each agent's solution is analyzed by critic nodes
4. **Scoring & Ranking**: Solutions are scored and ranked based on quality
5. **Winner Selection**: The best solution is identified and presented

### **3. Real-time Monitoring**
- **Live Chat Interface**: Monitor agent interactions in real-time
- **Progress Tracking**: Visual indicators of workflow progress
- **Result Display**: Comprehensive results panel with code, scores, and feedback

## 🛠️ Installation & Setup

### **System Requirements**
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
- **Internet Connection**: Required for AI model access and real-time features
- **API Keys**: OpenAI, Anthropic, Google, or HuggingFace API keys for AI services

### **Quick Start**
1. **Visit**: Open the web application in your browser
2. **Configure**: Add your API keys for cloud AI services
3. **Create**: Start building your first workflow
4. **Share**: Collaborate with team members in real-time

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/your-username/roundaible.git
cd roundaible

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Start development servers
npm run dev
```



## 🔧 Configuration

### **API Keys & Model Setup**
For detailed instructions on setting up API keys and local models, see the [API Setup Guide](API_SETUP_GUIDE.md).

RoundAIble supports multiple AI providers:
- **OpenAI**: GPT-4, GPT-3.5-turbo, GPT-4o
- **Anthropic**: Claude 3, Claude 2
- **Google**: Gemini Pro, Gemini Flash
- **HuggingFace**: Thousands of open-source models
- **Local Models**: Via Ollama (privacy-focused, offline capable)

### **Environment Configuration**
Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Keys (optional for local models)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
HUGGINGFACE_API_KEY=your_hf_key
```

## 📊 Workflow Examples

### **Example 1: Simple Code Generation**
1. Add an Input Node with your coding task
2. Connect to multiple Reasoning Agent nodes (API, Local, HuggingFace)
3. Connect Reasoning Agents to Critic nodes
4. Run the workflow to get multiple solutions with scores

### **Example 2: Code Review Workflow**
1. Input Node with existing code
2. Reasoning Agents analyze the code
3. Critic nodes provide detailed feedback
4. Get comprehensive code review with improvement suggestions

### **Example 3: Bug Fix Workflow**
1. Input Node with buggy code and error messages
2. Multiple agents attempt different fixes
3. Critics evaluate the quality of each fix
4. Select the best solution based on scores

## 🔒 Security & Privacy

### **Data Protection**
- **Local Processing**: Ollama models run entirely on your machine
- **Encrypted Storage**: Sensitive data is encrypted at rest
- **Secure Communication**: HTTPS for all API communications
- **No Data Collection**: RoundAIble doesn't collect or store your code

### **API Security**
- **Key Management**: Secure storage of API keys
- **Rate Limiting**: Built-in protection against API abuse
- **Error Handling**: Graceful handling of API failures
- **Fallback Options**: Local models as backup for cloud services

## 🐛 Troubleshooting

### **Common Issues**

#### **Ollama Connection Issues**
```bash
# Check if Ollama is running
ollama list

# Restart Ollama service
ollama serve

# Test model availability
ollama run codellama:7b "Hello, world!"
```

#### **API Key Problems**
- Verify API keys are correctly entered
- Check API key permissions and quotas
- Ensure internet connectivity for cloud models

#### **Performance Issues**
- Close unnecessary applications to free memory
- Use smaller models for faster response times
- Consider GPU acceleration for local models

### **Getting Help**
- Check the console for error messages
- Verify all dependencies are installed
- Ensure sufficient system resources
- Contact support with detailed error information



## 🤝 Support

For technical support, feature requests, or bug reports:
- **Email**: navidmoradimehr2@gmail.com
- **Documentation**: Check this README and inline help
- **Issues**: Report bugs with detailed information

## 📄 License

This software is proprietary and confidential. See the [LICENSE](LICENSE) file for complete terms and conditions.

---

**RoundAIble** - Empowering developers with AI-driven code generation and intelligent critique.

*Built with ❤️ by Navid Moradimehr* 