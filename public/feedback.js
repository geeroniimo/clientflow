/**
 * ClientFlow Feedback Script
 * Injected into Framer sites to capture user feedback
 */

(function() {
  'use strict';
  
  console.log('🎯 ClientFlow: Script loaded');
  
  const userId = window.clientFlowUserId;
  const apiUrl = window.clientFlowApiUrl || 'https://nonotubbly-unenthusiastic-catherina.ngrok-free.dev';
  
  if (!userId) {
    console.error('❌ ClientFlow: No user ID found');
    return;
  }
  
  console.log('✅ ClientFlow: User ID found:', userId);
  
  let feedbackMode = false;
  let sidebar = null;
  let commentBox = null;
  let clickedPosition = null;
  
  function createSidebar() {
    sidebar = document.createElement('div');
    sidebar.id = 'clientflow-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20px;
      width: 300px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      padding: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    sidebar.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111;">
          ClientFlow Feedback
        </h3>
        <p style="margin: 0; font-size: 13px; color: #666;">
          Click anywhere on the page to leave feedback
        </p>
      </div>
      
      <button id="clientflow-toggle" style="
        width: 100%;
        padding: 12px;
        background: #0099FF;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      ">
        Start Feedback Mode
      </button>
      
      <button id="clientflow-close" style="
        position: absolute;
        top: 12px;
        right: 12px;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #999;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      ">
        ×
      </button>
    `;
    
    document.body.appendChild(sidebar);
    
    document.getElementById('clientflow-toggle').addEventListener('click', toggleFeedbackMode);
    document.getElementById('clientflow-close').addEventListener('click', closeSidebar);
  }
  
  function toggleFeedbackMode() {
    feedbackMode = !feedbackMode;
    const btn = document.getElementById('clientflow-toggle');
    
    if (feedbackMode) {
      btn.textContent = 'Click anywhere...';
      btn.style.background = '#FF6B35';
      document.body.style.cursor = 'crosshair';
      console.log('🎯 Feedback mode: ON');
    } else {
      btn.textContent = 'Start Feedback Mode';
      btn.style.background = '#0099FF';
      document.body.style.cursor = 'default';
      console.log('❌ Feedback mode: OFF');
    }
  }
  
  function handleClick(e) {
    if (!feedbackMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const x = e.clientX;
    const y = e.clientY;
    
    const xPercent = (x / window.innerWidth) * 100;
    const yPercent = (y / window.innerHeight) * 100;
    
    console.log('📍 Click:', { x, y, xPercent: xPercent.toFixed(2), yPercent: yPercent.toFixed(2) });
    
    clickedPosition = { x, y, xPercent, yPercent };
    
    feedbackMode = false;
    document.body.style.cursor = 'default';
    
    showCommentBox(x, y);
  }
  
  function showCommentBox(x, y) {
    if (commentBox) {
      commentBox.remove();
    }
    
    commentBox = document.createElement('div');
    commentBox.id = 'clientflow-comment-box';
    commentBox.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 300px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
      padding: 16px;
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    commentBox.innerHTML = `
      <textarea 
        id="clientflow-textarea"
        placeholder="Describe the issue or suggestion..."
        style="
          width: 100%;
          min-height: 80px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 12px;
        "
      ></textarea>
      
      <div style="display: flex; gap: 8px;">
        <button id="clientflow-submit" style="
          flex: 1;
          padding: 10px;
          background: #0099FF;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">
          Send
        </button>
        
        <button id="clientflow-cancel" style="
          padding: 10px 16px;
          background: #f5f5f5;
          color: #666;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        ">
          Cancel
        </button>
      </div>
    `;
    
    document.body.appendChild(commentBox);
    
    document.getElementById('clientflow-textarea').focus();
    
    document.getElementById('clientflow-submit').addEventListener('click', submitFeedback);
    document.getElementById('clientflow-cancel').addEventListener('click', cancelComment);
  }
  
  async function submitFeedback() {
    const textarea = document.getElementById('clientflow-textarea');
    const content = textarea.value.trim();
    
    if (!content) {
      alert('Please enter your feedback');
      return;
    }
    
    console.log('📤 Submitting feedback:', content);
    
    const btn = document.getElementById('clientflow-submit');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    
    try {
      const response = await fetch(`${apiUrl}/api/feedback-inject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          content: content,
          page_url: window.location.href,
          position_x_percent: clickedPosition.xPercent,
          position_y_percent: clickedPosition.yPercent,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          breakpoint: getBreakpoint()
        })
      });
      
      if (response.ok) {
        console.log('✅ Feedback submitted');
        
        if (commentBox) {
          commentBox.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; margin-bottom: 8px;">✓</div>
              <p style="margin: 0; font-size: 14px; color: #666;">Feedback sent!</p>
            </div>
          `;
          
          setTimeout(() => {
            commentBox.remove();
            commentBox = null;
          }, 2000);
        }
        
        const toggleBtn = document.getElementById('clientflow-toggle');
        if (toggleBtn) {
          toggleBtn.textContent = 'Start Feedback Mode';
          toggleBtn.style.background = '#0099FF';
        }
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert('Failed to submit feedback. Please try again.');
      btn.textContent = 'Send';
      btn.disabled = false;
    }
  }
  
  function cancelComment() {
    if (commentBox) {
      commentBox.remove();
      commentBox = null;
    }
    
    clickedPosition = null;
    
    const btn = document.getElementById('clientflow-toggle');
    if (btn) {
      btn.textContent = 'Start Feedback Mode';
      btn.style.background = '#0099FF';
    }
  }
  
  function closeSidebar() {
    if (sidebar) {
      sidebar.remove();
      sidebar = null;
    }
    
    if (commentBox) {
      commentBox.remove();
      commentBox = null;
    }
    
    feedbackMode = false;
    document.body.style.cursor = 'default';
    document.removeEventListener('click', handleClick, true);
  }
  
  function getBreakpoint() {
    const width = window.innerWidth;
    if (width >= 1200) return 'desktop';
    if (width >= 810) return 'tablet';
    return 'mobile';
  }
  
  function init() {
    console.log('🚀 ClientFlow: Initializing...');
    createSidebar();
    document.addEventListener('click', handleClick, true);
    console.log('✅ ClientFlow: Ready');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();