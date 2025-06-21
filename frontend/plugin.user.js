// ==UserScript==
// @name         EchoVision AI Assistant (v1.6)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Interactive AI assistant using AWS services for accessibility
// @author       Shawn
// @match        *://*/*
// @match        file:///*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      127.0.0.1
// @connect      *
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function() {
    'use strict';
  
    const BASE_API_URL = 'http://127.0.0.1:5059';
    const ICON_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMyAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYuMzAyMyIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzU4NjJGOSIvPgo8cGF0aCBkPSJNNi44MDIzMSAxMi4xODdDNi45MDYzMSAxMC4wODcgNy4yMTczMSA4Ljc3NyA4LjE0OTMxIDcuODQ3QzkuMDc5MzEgNi45MTUgMTAuMzg5MyA2LjYwNCAxMi40ODkzIDYuNU0yNS44MDIzIDEyLjE4N0MyNS42OTgzIDEwLjA4NyAyNS4zODczIDguNzc3IDI0LjQ1NTMgNy44NDdDMjMuNTI1MyA2LjkxNSAyMi4yMTUzIDYuNjA0IDIwLjExNTMgNi41TTIwLjExNTMgMjUuNUMyMi4yMTUzIDI1LjM5NiAyMy41MjUzIDI1LjA4NSAyNC40NTUzIDI0LjE1M0MyNS4zODczIDIzLjIyMyAyNS42OTgzIDIxLjkxMyAyNS44MDIzIDE5LjgxM00xMi40ODkzIDI1LjVDMTAuMzg5MyAyNS4zOTYgOS4wNzkzMSAyNS4wODUgOC4xNDkzMSAyNC4xNTNDNy4yMTczMSAyMy4yMjMgNi45MDYzMSAyMS45MTMgNi44MDIzMSAxOS44MTNNMjMuOTM3MyAxNS4zMThDMjQuMTgwMyAxNS42MjIgMjQuMzAyMyAxNS43NzUgMjQuMzAyMyAxNkMyNC4zMDIzIDE2LjIyNSAyNC4xODAzIDE2LjM3OCAyMy45MzczIDE2LjY4MkMyMi44NDQzIDE4LjA1IDIwLjA1MzMgMjEgMTYuMzAyMyAyMUMxMi41NTEzIDIxIDkuNzYwMzEgMTguMDUgOC42NjczMSAxNi42ODJDOC40MjQzMSAxNi4zNzggOC4zMDIzMSAxNi4yMjUgOC4zMDIzMSAxNkM4LjMwMjMxIDE1Ljc3NSA4LjQyNDMxIDE1LjYyMiA4LjY2NzMxIDE1LjMxOEM5Ljc2MDMxIDEzLjk1IDEyLjU1MTMgMTEgMTYuMzAyMyAxMUMyMC4wNTMzIDExIDIyLjg0NDMgMTMuOTUgMjMuOTM3MyAxNS4zMThaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg==';
  
    let isProcessing    = false;
    let isRecording     = false;
    let fullScreenTrack = null;
    let chatbot         = null;
    let recognition     = null;
    const synth         = window.speechSynthesis;
  
    // --- CSS for UI ---
    GM_addStyle(
      .echovision-card { all: initial; position:fixed; top:20px; right:20px; width:300px; background:#fff; border:1px solid #E6E7E8; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.1); font-family:Arial,sans-serif; z-index:999999; display:flex; flex-direction:column; }
      .echovision-card .header { display:flex; align-items:center; padding:12px; gap:8px; }
      .echovision-card .header img { width:24px; height:24px; }
      .echovision-card .header .title { font-size:16px; font-weight:bold; color:#16191F; }
      .echovision-card .greeting { padding:0 12px 12px; font-size:14px; color:#4A4A4A; }
      .echovision-card .msg-container { flex:1; padding:0 12px; overflow-y:auto; max-height:200px; }
      .echovision-card .msg { margin-bottom:8px; padding:6px 10px; border-radius:6px; font-size:13px; line-height:1.4; }
      .echovision-card .msg.user { background:#007bff; color:#fff; align-self:flex-end; }
      .echovision-card .msg.bot  { background:#f0f0f0; color:#16191F; align-self:flex-start; }
      .echovision-card .input-wrapper { display:flex; padding:8px 12px; gap:4px; border-top:1px solid #E6E7E8; }
      .echovision-card .input-wrapper input { flex:1; padding:8px; border:1px solid #E6E7E8; border-radius:4px; font-size:14px; }
      .echovision-card .input-wrapper button { width:36px; border:1px solid #5862F9; border-left:none; border-radius:0 4px 4px 0; background:#5862F9; color:#fff; cursor:pointer; transition:background 0.2s;}
      .echovision-card .input-wrapper button:hover { background:#4650DB; }
      .echovision-card .suggestions { border-top:1px solid #E6E7E8; padding:12px; }
      .echovision-card .suggestions .label { font-size:12px; color:#999; margin-bottom:8px; }
      .echovision-card .suggestions .item { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:4px; cursor:pointer; font-size:14px; }
      .echovision-card .suggestions .item:hover { background:#f5f5f5; }
      .echovision-card .suggestions .icon { width:16px; text-align:center; font-size:16px; }
    );
  
    // --- request share on startup ---
    async function requestScreenShare() {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        fullScreenTrack = stream.getVideoTracks()[0];
      } catch (err) {
        console.warn('Screen share denied or failed:', err);
      }
    }
  
    // --- create activation button ---
    function createButton() {
      const btn = document.createElement('button');
      btn.textContent = 'EV';
      Object.assign(btn.style, {
        position:'fixed', top:'20px', right:'20px',
        width:'40px', height:'40px', background:'#5862F9',
        color:'#fff', border:'none', borderRadius:'4px',
        cursor:'pointer', fontSize:'16px', fontWeight:'bold',
        zIndex:999999
      });
      document.body.appendChild(btn);
      return btn;
    }
  
    // --- build UI ---
    function createUI() {
      const c = document.createElement('div');
      c.className = 'echovision-card';
      c.innerHTML = 
        <div class="header">
          <img src="${ICON_SVG}" alt="logo"/>
          <div class="title">EchoVision</div>
        </div>
        <div class="greeting">Hi✨,<br/>I’m your AI assistant!</div>
        <div class="msg-container"></div>
        <div class="input-wrapper">
          <input placeholder="Ask me anything!" />
          <button>→</button>
        </div>
        <div class="suggestions">
          <div class="label">Try:</div>
          <div class="item" data-q="Describe screenshot"><span class="icon">✂️</span>Describe screenshot</div>
          <div class="item" data-q="Summarize visual contents"><span class="icon">📄</span>Summarize visual contents</div>
        </div>
      ;
      document.body.appendChild(c);
  
      const inp   = c.querySelector('input');
      const btn   = c.querySelector('button');
      const cont  = c.querySelector('.msg-container');
      const items = c.querySelectorAll('.suggestions .item');
  
      function append(txt, user = false) {
        const m = document.createElement('div');
        m.className = 'msg ' + (user ? 'user' : 'bot');
        m.textContent = txt;
        cont.appendChild(m);
        cont.scrollTop = cont.scrollHeight;
      }
  
      function submit(q) {
        if (!q || isProcessing) return;
        append(q, true);
        handle(q, append);
        inp.value = '';
      }
  
      btn.addEventListener('click', () => submit(inp.value.trim()));
      inp.addEventListener('keypress', e => e.key === 'Enter' && submit(inp.value.trim()));
      items.forEach(it => it.addEventListener('click', () => submit(it.dataset.q)));
  
      return { append };
    }
  
    async function capture() {
      if (fullScreenTrack) {
        try {
          const cap    = new ImageCapture(fullScreenTrack);
          const bmp    = await cap.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width  = bmp.width;
          canvas.height = bmp.height;
          canvas.getContext('2d').drawImage(bmp, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.8);
        } catch (err) {
          console.warn('ImageCapture failed, falling back to html2canvas:', err);
        }
      }
      try {
        const opts = {
          useCORS: true,
          allowTaint: true,
          scale: window.devicePixelRatio || 1,
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.pageXOffset,
          scrollY: window.pageYOffset,
          onclone: doc => doc.querySelectorAll('iframe,video,canvas').forEach(el => el.remove())
        };
        const canvas = await html2canvas(document.body, opts);
        return canvas.toDataURL('image/jpeg', 0.7);
      } catch (err) {
        console.error('html2canvas error:', err);
        return null;
      }
    }
  
    // --- speak helper ---
    async function speak(text) {
      return new Promise(resolve => {
        if (synth.speaking) synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 1.0;
        u.onend = resolve; u.onerror = resolve;
        synth.speak(u);
      });
    }
  
    // --- question handler ---
    async function handle(question, append) {
      isProcessing = true;
      append('…');
      try {
        const shot = await capture();
        if (!shot) throw 'no screenshot';
        const res = await fetch(${BASE_API_URL}/analyze, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: shot, question })
        });
        if (!res.ok) throw res.status;
        const { description } = await res.json();
        append(description);
        await speak(description);
      } catch (err) {
        console.error(err);
        append('Error – please try again.');
        await speak('An error occurred. Please try again.');
      } finally {
        isProcessing = false;
      }
    }
  
    // --- speech-to-text (Ctrl+Shift+V) ---
    function initRecognition(append) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return null;
      const r = new SR();
      r.continuous = false;
      r.interimResults = false;
      r.lang = 'en-US';
      r.onresult = evt => {
        const txt = evt.results[0][0].transcript;
        append(txt, true);
        handle(txt, append);
      };
      r.onerror = () => append('Speech recognition error.', false);
      return r;
    }
  
    // --- initialize on DOM ready ---
    async function initialize() {
      await requestScreenShare();
  
      const btn = createButton();
      btn.addEventListener('click', () => {
        btn.remove();
        chatbot    = createUI();
        recognition = initRecognition(chatbot.append);
  
        const welcome = 'Welcome to EchoVision. I can help you understand any content on this page. Press Control Shift V to start speaking your question, or type your question directly.';
        chatbot.append(welcome);
        speak(welcome);
      });
  
      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v' && recognition) {
          if (!isRecording) {
            isRecording = true;
            recognition.start();
          } else {
            recognition.stop();
            isRecording = false;
          }
        }
      });
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  })();