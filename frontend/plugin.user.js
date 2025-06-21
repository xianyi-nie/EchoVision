// ==UserScript==
// @name         EchoVision AI Assistant
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Interactive AI assistant using AWS services for accessibility
// @author       Your name
// @match        *://*/*
// @match        file:///*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      *********t
// @connect      *********1
// @connect      *
// @connect      127.0.0.1
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const BASE_API_URL = 'http://127.0.0.1:5059';

  let isProcessing = false;
  let speechSynthesis = window.speechSynthesis;
  let isSpeaking = false;
  let chatbot;
  let recognition = null;
  let isRecording = false;
  let fullScreenStream = null;
  let fullScreenTrack = null;

  const globalStyle = document.createElement('style');
  globalStyle.textContent = `
        .echovision-element {
            font-family: Arial, sans-serif !important;
            line-height: normal !important;
            box-sizing: border-box !important;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
  document.head.appendChild(globalStyle);
  function createInitialInteractionButton() {
    const button = document.createElement('button');
    button.className = 'echovision-element';
    button.textContent = 'Activate EchoVision';
    button.style.cssText = `
            all: initial !important;
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            padding: 10px 20px !important;
            background: #FF9900 !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 16px !important;
            z-index: 2147483647 !important;
            font-family: Arial, sans-serif !important;
            display: block !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
            transition: transform 0.2s !important;
            transform: scale(1) !important;
            text-align: center !important;
            line-height: normal !important;
            pointer-events: auto !important;
        `;
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.05) !important';
      button.style.backgroundColor = '#ff8c00 !important';
    });
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1) !important';
      button.style.backgroundColor = '#FF9900 !important';
    });

    document.documentElement.appendChild(button);
    return button;
  }

  function createChatbotInterface() {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'echovision-element';
    chatContainer.style.cssText = `
            all: initial !important;
            position: fixed !important;
            right: 20px !important;
            top: 20px !important;
            width: 320px !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15) !important;
            z-index: 2147483647 !important;
            font-family: Arial, sans-serif !important;
            display: flex !important;
            flex-direction: column !important;
            max-height: 80vh !important;
            border: 1px solid #E6E7E8 !important;
            pointer-events: auto !important;
        `;

    const header = document.createElement('div');
    header.className = 'echovision-element';
    header.style.cssText = `
            padding: 16px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-bottom: 1px solid #E6E7E8 !important;
            background: white !important;
            border-radius: 8px 8px 0 0 !important;
            cursor: move !important;
        `;

    const title = document.createElement('div');
    title.className = 'echovision-element';
    title.innerHTML = 'EchoVision';
    title.style.cssText = `
            font-weight: bold !important;
            font-size: 16px !important;
            color: #16191F !important;
            flex-grow: 1 !important;
            font-family: Arial, sans-serif !important;
        `;

    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'echovision-element';
    minimizeButton.innerHTML = '−';
    minimizeButton.style.cssText = `
            all: initial !important;
            background: none !important;
            border: none !important;
            font-size: 20px !important;
            cursor: pointer !important;
            color: #666 !important;
            padding: 0 4px !important;
            font-family: Arial, sans-serif !important;
            line-height: 1 !important;
        `;
    const chatContent = document.createElement('div');
    chatContent.className = 'echovision-element';
    chatContent.style.cssText = `
            padding: 16px !important;
            height: 360px !important;
            overflow-y: auto !important;
            flex-grow: 1 !important;
            background: white !important;
            font-family: Arial, sans-serif !important;
            scrollbar-width: thin !important;
            scrollbar-color: #FF9900 #f0f0f0 !important;
        `;

    const inputArea = document.createElement('div');
    inputArea.className = 'echovision-element';
    inputArea.style.cssText = `
            padding: 16px !important;
            border-top: 1px solid #E6E7E8 !important;
            display: flex !important;
            gap: 8px !important;
            background: white !important;
            border-radius: 0 0 8px 8px !important;
        `;

    const textInput = document.createElement('input');
    textInput.className = 'echovision-element';
    textInput.type = 'text';
    textInput.placeholder = 'Ask EchoVision about what you see...';
    textInput.style.cssText = `
            all: initial !important;
            flex: 1 !important;
            padding: 8px 12px !important;
            border: 1px solid #E6E7E8 !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            font-family: Arial, sans-serif !important;
            color: #333 !important;
            background: white !important;
        `;

    const sendButton = document.createElement('button');
    sendButton.className = 'echovision-element';
    sendButton.innerHTML = '↑';
    sendButton.style.cssText = `
            all: initial !important;
            padding: 8px 16px !important;
            background: #FF9900 !important;
            border: none !important;
            border-radius: 4px !important;
            color: white !important;
            cursor: pointer !important;
            font-weight: bold !important;
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            line-height: normal !important;
            transition: background-color 0.2s !important;
        `;

    inputArea.appendChild(textInput);
    inputArea.appendChild(sendButton);
    header.appendChild(title);
    header.appendChild(minimizeButton);
    chatContainer.appendChild(header);
    chatContainer.appendChild(chatContent);
    chatContainer.appendChild(inputArea);

    document.documentElement.appendChild(chatContainer);

    function submitQuestion() {
      const question = textInput.value.trim();
      if (question && !isProcessing) {
        handleQuestion(question);
        textInput.value = '';
      }
    }

    sendButton.addEventListener('click', submitQuestion);
    textInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        submitQuestion();
      }
    });

    let isMinimized = false;
    minimizeButton.addEventListener('click', () => {
      if (isMinimized) {
        chatContent.style.display = 'block !important';
        inputArea.style.display = 'flex !important';
        minimizeButton.innerHTML = '−';
      } else {
        chatContent.style.display = 'none !important';
        inputArea.style.display = 'none !important';
        minimizeButton.innerHTML = '+';
      }
      isMinimized = !isMinimized;
    });

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', dragStart);

    function dragStart(e) {
      if (e.target === minimizeButton) return;
      initialX = e.clientX - chatContainer.offsetLeft;
      initialY = e.clientY - chatContainer.offsetTop;
      isDragging = true;

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragEnd);
    }
    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        chatContainer.style.left = currentX + 'px';
        chatContainer.style.top = currentY + 'px';
        chatContainer.style.right = 'auto';
      }
    }

    function dragEnd() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', dragEnd);
    }

    sendButton.addEventListener('mouseover', () => {
      sendButton.style.backgroundColor = '#ff8c00 !important';
    });
    sendButton.addEventListener('mouseout', () => {
      sendButton.style.backgroundColor = '#FF9900 !important';
    });

    return {
      container: chatContainer,
      chatContent: chatContent,
      inputField: textInput,
      voiceControls: {
        getRate: () => 1.0,
        getVoice: () =>
          speechSynthesis.getVoices().find(v => v.lang === 'en-US'),
      },
    };
  }

  function updateChatContent(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'echovision-element';
    messageDiv.style.cssText = `
            margin-bottom: 10px !important;
            padding: 8px 12px !important;
            border-radius: 8px !important;
            max-width: 80% !important;
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            ${
              isUser
                ? 'background: #007bff !important; color: white !important; margin-left: auto !important;'
                : 'background: #f0f0f0 !important; color: black !important;'
            }
        `;
    messageDiv.textContent = message;

    if (!isUser) {
      const indicator = document.createElement('span');
      indicator.textContent = '🔊 ';
      indicator.style.cssText = `
                display: inline-block !important;
                margin-right: 5px !important;
                animation: pulse 1s infinite !important;
            `;
      messageDiv.prepend(indicator);
    }

    chatbot.chatContent.appendChild(messageDiv);
    chatbot.chatContent.scrollTop = chatbot.chatContent.scrollHeight;
  }

  async function speak(text) {
    return new Promise(resolve => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = chatbot.voiceControls.getRate();
      utterance.voice = chatbot.voiceControls.getVoice();

      utterance.onstart = () => {
        isSpeaking = true;
      };

      utterance.onend = () => {
        isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        isSpeaking = false;
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }
  async function initializeVoices() {
    return new Promise(resolve => {
      let voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve(voices);
        };
      }
    });
  }

  async function requestScreenShare() {
    try {
      fullScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      fullScreenTrack = fullScreenStream.getVideoTracks()[0];
    } catch (e) {
      console.warn('User reject share screen', e);
    }
  }

  async function captureFullScreenFrame() {
    if (!fullScreenTrack) {
      throw new Error('Please Authorize firstly');
    }
    const track = fullScreenTrack;

    try {
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      const video = document.createElement('video');
      video.srcObject = fullScreenStream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
  }

  async function captureScreen() {
    try {
      return await captureFullScreenFrame();
    } catch (e) {
      console.warn('CaptureFullScreen failed, back to html2canvas:', e);
    }
    try {
      const options = {
        logging: true,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        removeContainer: true,
        scale: window.devicePixelRatio || 1,
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.pageXOffset,
        scrollY: window.pageYOffset,
        onclone: clonedDoc => {
          clonedDoc
            .querySelectorAll('iframe, embed, object, video, canvas')
            .forEach(elem => {
              elem.remove();
            });

          clonedDoc.querySelectorAll('img').forEach(img => {
            try {
              img.crossOrigin = 'anonymous';
              if (
                img.src.startsWith('http') &&
                !img.src.includes(window.location.hostname)
              ) {
                img.src = img.src;
              }
            } catch (e) {
              console.warn('Could not set crossOrigin for image:', e);
            }
          });
        },
      };

      const canvas = await html2canvas(document.body, options);
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
      console.error('Screenshot error:', error);
      return null;
    }
  }

  async function sendToAI(imageBase64URL, question = null) {
    try {
      const response = await fetch(`${BASE_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64URL,
          question: question,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      return data.description;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async function handleQuestion(question) {
    updateChatContent(question, true);
    isProcessing = true;
    try {
      const screenshot = await captureScreen();
      if (!screenshot) {
        const errorMsg = 'Failed to capture screen content';
        updateChatContent(errorMsg);
        await speak(errorMsg);
        return;
      }

      const response = await sendToAI(screenshot, question);
      updateChatContent(response);
      await speak(response);
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = 'An error occurred while processing your question';
      updateChatContent(errorMsg);
      await speak(errorMsg);
    } finally {
      isProcessing = false;
    }
  }
  function initializeSpeechRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    return recognition;
  }

  function startRecording() {
    if (isRecording) return;

    if (!recognition) {
      recognition = initializeSpeechRecognition();
      if (!recognition) {
        updateChatContent('Speech recognition not supported in this browser');
        speak('Speech recognition not supported in this browser');
        return;
      }

      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        handleQuestion(transcript);
      };

      recognition.onerror = event => {
        console.error('Speech recognition error:', event.error);
        updateChatContent('Error recognizing speech. Please try again.');
        speak('Error recognizing speech. Please try again.');
        isRecording = false;
      };

      recognition.onend = () => {
        isRecording = false;
        speak('Let me check that for you.');
      };
    }

    isRecording = true;
    recognition.start();
    speak('Please go ahead with your question.');
  }

  function stopRecording() {
    if (!isRecording) return;

    if (recognition) {
      recognition.stop();
      isRecording = false;
    }
  }

  async function initialize() {
    await requestScreenShare();
    const activateButton = createInitialInteractionButton();

    activateButton.addEventListener('click', async () => {
      activateButton.remove();
      chatbot = createChatbotInterface();

      await new Promise(resolve => {
        if (speechSynthesis.getVoices().length > 0) {
          resolve();
        } else {
          speechSynthesis.onvoiceschanged = resolve;
        }
      });

      const welcomeMessage =
        'Welcome to EchoVision. I can help you understand any content on this page. Press Control Shift V to start speaking your question, or type your question directly.';
      updateChatContent(welcomeMessage);

      setTimeout(async () => {
        try {
          await speak(welcomeMessage);
        } catch (error) {
          console.error('Error speaking welcome message:', error);
          updateChatContent(
            'Error: Could not play audio. Please check your audio settings.'
          );
        }
      }, 100);
    });
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
      if (!isRecording) {
        startRecording();
      } else {
        stopRecording();
      }
    }
  });

  initialize();
})();
