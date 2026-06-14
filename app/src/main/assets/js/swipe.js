let dragState = null;

function initSwipe(card, onSwipe) {
  card.addEventListener('touchstart', onStart, { passive: true });
  card.addEventListener('touchmove',  onMove,  { passive: false });
  card.addEventListener('touchend',   onEnd);
  card.addEventListener('mousedown',  onStart);

  function onStart(e) {
    const pt = e.touches ? e.touches[0] : e;
    dragState = { startX: pt.clientX, startY: pt.clientY, x: 0, y: 0 };
    card.classList.remove('snap-back');
    if (!e.touches) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    }
  }

  function onMove(e) {
    if (!dragState) return;
    if (e.cancelable) e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    dragState.x = pt.clientX - dragState.startX;
    dragState.y = pt.clientY - dragState.startY;
    const rot = dragState.x * 0.08;
    card.style.transform = `translateX(${dragState.x}px) translateY(${dragState.y * 0.3}px) rotate(${rot}deg)`;

    // Indicators
    const ratio = Math.min(Math.abs(dragState.x) / 80, 1);
    const likeEl = card.querySelector('.swipe-indicator.like');
    const nopeEl = card.querySelector('.swipe-indicator.nope');
    if (likeEl) likeEl.style.opacity = dragState.x > 0 ? ratio : 0;
    if (nopeEl) nopeEl.style.opacity = dragState.x < 0 ? ratio : 0;
  }

  function onEnd() {
    if (!dragState) return;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    const threshold = 80;
    if (dragState.x > threshold) {
      onSwipe('right');
    } else if (dragState.x < -threshold) {
      onSwipe('left');
    } else {
      card.classList.add('snap-back');
      card.style.transform = '';
      const likeEl = card.querySelector('.swipe-indicator.like');
      const nopeEl = card.querySelector('.swipe-indicator.nope');
      if (likeEl) likeEl.style.opacity = 0;
      if (nopeEl) nopeEl.style.opacity = 0;
    }
    dragState = null;
  }
}

function animateSwipe(card, direction, cb) {
  card.classList.add(direction === 'right' ? 'flying-right' : 'flying-left');
  setTimeout(cb, 350);
}
