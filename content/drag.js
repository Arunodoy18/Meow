/**
 * Meow AI - Drag Module
 * Smooth RAF-based dragging with momentum, snap-to-edge,
 * and position persistence via MeowStorage
 */

const MeowDrag = (() => {
  'use strict';

  let _button = null;
  let _isDragging = false;
  let _wasDragged = false;
  let _rafId = null;

  // Drag state
  let _startX = 0;
  let _startY = 0;
  let _offsetX = 0;
  let _offsetY = 0;
  let _targetX = 0;
  let _targetY = 0;
  let _currentX = 0;
  let _currentY = 0;

  // Velocity for momentum
  let _velocityX = 0;
  let _velocityY = 0;
  let _lastMoveX = 0;
  let _lastMoveY = 0;
  let _lastMoveTime = 0;

  const DRAG_THRESHOLD = 5;   // px before drag starts
  const FRICTION = 0.85;      // momentum decay
  const SNAP_MARGIN = 20;     // px from edge to snap
  const LERP_FACTOR = 0.25;   // smoothing factor

  // ==================== INITIALIZATION ====================

  function init(buttonEl) {
    _button = buttonEl;
    _button.addEventListener('mousedown', _onMouseDown, { passive: false });
    _button.addEventListener('touchstart', _onTouchStart, { passive: false });
    _loadPosition();
  }

  // ==================== MOUSE EVENTS ====================

  function _onMouseDown(e) {
    if (e.button !== 0) return; // left click only

    e.preventDefault();
    _startDrag(e.clientX, e.clientY);

    document.addEventListener('mousemove', _onMouseMove, { passive: false });
    document.addEventListener('mouseup', _onMouseUp);
  }

  function _onMouseMove(e) {
    e.preventDefault();
    _updateDrag(e.clientX, e.clientY);
  }

  function _onMouseUp() {
    document.removeEventListener('mousemove', _onMouseMove);
    document.removeEventListener('mouseup', _onMouseUp);
    _endDrag();
  }

  // ==================== TOUCH EVENTS ====================

  function _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    _startDrag(touch.clientX, touch.clientY);

    document.addEventListener('touchmove', _onTouchMove, { passive: false });
    document.addEventListener('touchend', _onTouchEnd);
    document.addEventListener('touchcancel', _onTouchEnd);
  }

  function _onTouchMove(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    _updateDrag(touch.clientX, touch.clientY);
  }

  function _onTouchEnd() {
    document.removeEventListener('touchmove', _onTouchMove);
    document.removeEventListener('touchend', _onTouchEnd);
    document.removeEventListener('touchcancel', _onTouchEnd);
    _endDrag();
  }

  // ==================== DRAG LOGIC ====================

  function _startDrag(clientX, clientY) {
    const rect = _button.getBoundingClientRect();
    _offsetX = clientX - rect.left;
    _offsetY = clientY - rect.top;
    _startX = clientX;
    _startY = clientY;
    _isDragging = false;
    _wasDragged = false;
    _velocityX = 0;
    _velocityY = 0;
    _lastMoveX = clientX;
    _lastMoveY = clientY;
    _lastMoveTime = performance.now();
    _currentX = rect.left;
    _currentY = rect.top;
  }

  function _updateDrag(clientX, clientY) {
    const dx = clientX - _startX;
    const dy = clientY - _startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!_isDragging && distance > DRAG_THRESHOLD) {
      _isDragging = true;
      _wasDragged = true;
      _button.style.cursor = 'grabbing';
      _button.style.transition = 'none';
      _button.classList.add('meow-dragging');
      _startRAF();
    }

    if (_isDragging) {
      // Calculate velocity for momentum
      const now = performance.now();
      const dt = now - _lastMoveTime;
      if (dt > 0) {
        _velocityX = (clientX - _lastMoveX) / dt * 16; // normalize to ~60fps
        _velocityY = (clientY - _lastMoveY) / dt * 16;
      }
      _lastMoveX = clientX;
      _lastMoveY = clientY;
      _lastMoveTime = now;

      // Set target position (clamped to viewport)
      const maxX = window.innerWidth - _button.offsetWidth;
      const maxY = window.innerHeight - _button.offsetHeight;
      _targetX = Math.max(0, Math.min(clientX - _offsetX, maxX));
      _targetY = Math.max(0, Math.min(clientY - _offsetY, maxY));
    }
  }

  function _endDrag() {
    if (_isDragging) {
      _isDragging = false;
      _button.style.cursor = '';
      _button.classList.remove('meow-dragging');

      // Apply momentum then snap
      _applyMomentum();
    }
  }

  // ==================== RAF ANIMATION LOOP ====================

  function _startRAF() {
    if (_rafId) return;
    _rafId = requestAnimationFrame(_animationLoop);
  }

  function _stopRAF() {
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  function _animationLoop() {
    // Smooth interpolation
    _currentX += (_targetX - _currentX) * LERP_FACTOR;
    _currentY += (_targetY - _currentY) * LERP_FACTOR;

    // Use transform for GPU-accelerated rendering
    _button.style.left = '0px';
    _button.style.top = '0px';
    _button.style.right = 'auto';
    _button.style.bottom = 'auto';
    _button.style.transform = `translate(${Math.round(_currentX)}px, ${Math.round(_currentY)}px)`;

    // Continue loop if still dragging or animating
    const distToTarget = Math.abs(_targetX - _currentX) + Math.abs(_targetY - _currentY);
    if (_isDragging || distToTarget > 0.5) {
      _rafId = requestAnimationFrame(_animationLoop);
    } else {
      _rafId = null;
      _finalizePosition();
    }
  }

  // ==================== MOMENTUM & SNAP ====================

  function _applyMomentum() {
    const maxX = window.innerWidth - _button.offsetWidth;
    const maxY = window.innerHeight - _button.offsetHeight;

    _targetX = Math.max(0, Math.min(_targetX + _velocityX * 5, maxX));
    _targetY = Math.max(0, Math.min(_targetY + _velocityY * 5, maxY));

    // Snap to nearest edge
    const distLeft = _targetX;
    const distRight = maxX - _targetX;

    if (distLeft < distRight) {
      _targetX = SNAP_MARGIN;
    } else {
      _targetX = maxX - SNAP_MARGIN;
    }

    // Re-enable transition for snap animation
    _button.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    _button.style.transform = `translate(${Math.round(_targetX)}px, ${Math.round(_targetY)}px)`;

    // Save after animation
    setTimeout(() => {
      _finalizePosition();
      _button.style.transition = '';
    }, 350);
  }

  function _finalizePosition() {
    _currentX = _targetX;
    _currentY = _targetY;
    _savePosition();
  }

  // ==================== POSITION PERSISTENCE ====================

  function _savePosition() {
    MeowStorage.saveButtonPosition(Math.round(_currentX), Math.round(_currentY));
  }

  async function _loadPosition() {
    const pos = await MeowStorage.loadButtonPosition();
    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
      _currentX = pos.left;
      _currentY = pos.top;
      _targetX = pos.left;
      _targetY = pos.top;

      // Clamp to current viewport
      const maxX = window.innerWidth - (_button.offsetWidth || 60);
      const maxY = window.innerHeight - (_button.offsetHeight || 60);
      _currentX = Math.max(0, Math.min(_currentX, maxX));
      _currentY = Math.max(0, Math.min(_currentY, maxY));

      _button.style.left = '0px';
      _button.style.top = '0px';
      _button.style.right = 'auto';
      _button.style.bottom = 'auto';
      _button.style.transform = `translate(${Math.round(_currentX)}px, ${Math.round(_currentY)}px)`;
    }
  }

  // ==================== PUBLIC API ====================

  function wasDragged() {
    const result = _wasDragged;
    _wasDragged = false;
    return result;
  }

  function destroy() {
    _stopRAF();
    if (_button) {
      _button.removeEventListener('mousedown', _onMouseDown);
      _button.removeEventListener('touchstart', _onTouchStart);
    }
    document.removeEventListener('mousemove', _onMouseMove);
    document.removeEventListener('mouseup', _onMouseUp);
    document.removeEventListener('touchmove', _onTouchMove);
    document.removeEventListener('touchend', _onTouchEnd);
  }

  return {
    init,
    wasDragged,
    destroy
  };
})();
