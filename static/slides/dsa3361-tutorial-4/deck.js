(() => {
  const deck = document.getElementById('deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const notes = document.getElementById('notes-panel');
  const notesToggle = document.getElementById('notes-toggle');
  let index = 0;
  let transitioning = false;

  function resize() {
    const availableHeight = Math.max(100, window.innerHeight - 38);
    const scale = Math.min(window.innerWidth / 1600, availableHeight / 900);
    deck.style.transform = `scale(${scale})`;
    deck.style.left = `${(window.innerWidth - 1600 * scale) / 2}px`;
    deck.style.top = `${(availableHeight - 900 * scale) / 2}px`;
  }
  function show(next, updateHash = true) {
    if (slides[index] && next !== index) {
      const preview = slides[index].querySelector('.fit-summary-preview');
      if (preview) {
        preview.hidden = true;
        slides[index].querySelector('.summary-trigger').setAttribute('aria-expanded', 'false');
      }
      const quadraticCode = slides[index].querySelector('.quadratic-reveal-code');
      if (quadraticCode) {
        quadraticCode.hidden = true;
        slides[index].querySelector('.panel-placeholder').hidden = false;
        slides[index].classList.remove('quadratic-explaining');
        slides[index].querySelector('.quadratic-left-explanation').hidden = true;
        slides[index].querySelector('.quadratic-summary-preview').hidden = true;
        slides[index].querySelector('.quadratic-comparison-results').hidden = true;
      }
      slides[index].classList.remove('reveal-right', 'reveal-code', 'reveal-x', 'reveal-eps', 'reveal-middle', 'reveal-y', 'reveal-quadratic-code', 'reveal-quadratic-results');
    }
    index = Math.max(0, Math.min(slides.length - 1, next));
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.setAttribute('aria-hidden', String(i !== index));
      s.inert = i !== index;
    });
    if (slides[index].id === 'quadratic') {
      slides[index].querySelector('.quadratic-reveal-code').hidden = false;
      slides[index].querySelector('.panel-placeholder').hidden = true;
      slides[index].classList.add('reveal-quadratic-code');
    }
    document.getElementById('slide-number').textContent = `${index + 1} / ${slides.length}`;
    document.getElementById('previous').disabled = index === 0;
    document.getElementById('next').disabled = index === slides.length - 1;
    document.getElementById('notes-text').textContent = slides[index].querySelector('.speaker-notes')?.textContent || '';
    if (updateHash) history.replaceState(null, '', `#${slides[index].id}`);
  }
  function fromHash() {
    const found = slides.findIndex(s => `#${s.id}` === location.hash);
    show(found < 0 ? 0 : found, false);
  }
  function magicMoveTarget(from, to) {
    return null;
  }
  function animatePageMove(from, to, targetIndex) {
    const enabled = (from.id === 'falling' && to.id === 'agenda') ||
      (from.id === 'agenda' && to.id === 'world') ||
      (from.id === 'fit' && to.id === 'plotting') ||
      (from.id === 'plotting' && to.id === 'summary') ||
      (from.id === 'noise' && to.id === 'takeaway');
    if (!enabled) return false;
    const reverse = from.id === 'plotting' && to.id === 'summary';
    const outgoing = from.cloneNode(true);
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.inert = true;
    outgoing.style.pointerEvents = 'none';
    outgoing.style.zIndex = '100';
    transitioning = true;
    show(targetIndex);
    deck.appendChild(outgoing);
    const options = { duration: 800, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' };
    const exit = outgoing.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(${reverse ? '1600px' : '-1600px'})` },
    ], options);
    const enter = to.animate([
      { transform: `translateX(${reverse ? '-1600px' : '1600px'})` },
      { transform: 'translateX(0)' },
    ], options);
    Promise.all([exit.finished, enter.finished]).then(() => {
      outgoing.remove();
      exit.cancel();
      enter.cancel();
      transitioning = false;
    });
    return true;
  }
  function splitMoveTarget(from, to) {
    if (from.id === 'world' && to.id === 'fit') {
      return { source: from.querySelector('.world-reveal-layout'), target: to.querySelector('.fit-bottom') };
    }
    return null;
  }
  function animateSplitMove(from, to, targetIndex) {
    const move = splitMoveTarget(from, to);
    if (!move || !move.source || !move.target) return false;
    const titleSource = from.querySelector('h2');
    const titleTarget = to.querySelector('h2');
    const sourceRect = move.source.getBoundingClientRect();
    const titleSourceRect = titleSource?.getBoundingClientRect();
    const deckRect = deck.getBoundingClientRect();
    const scale = deckRect.width / deck.offsetWidth;
    const sourceClone = move.source.cloneNode(true);
    const targetClone = move.target.cloneNode(true);
    const placeClone = (clone, rect) => Object.assign(clone.style, {
      position: 'absolute',
      left: `${(rect.left - deckRect.left) / scale}px`,
      top: `${(rect.top - deckRect.top) / scale}px`,
      width: `${rect.width / scale}px`,
      height: `${rect.height / scale}px`,
      margin: '0',
      zIndex: '100',
      pointerEvents: 'none',
    });
    placeClone(sourceClone, sourceRect);
    sourceClone.style.display = 'grid';
    sourceClone.querySelector('.world-code-box').style.display = 'block';
    sourceClone.querySelectorAll('.world-formula-piece').forEach(piece => {
      piece.style.visibility = 'visible';
    });
    deck.appendChild(sourceClone);
    const titleSourceClone = titleSource?.cloneNode(true);
    const titleTargetClone = titleTarget?.cloneNode(true);
    const styleTitleClone = (clone, original) => {
      if (!clone || !original) return;
      Object.assign(clone.style, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '48px',
        fontWeight: '600',
        lineHeight: '55.2px',
        letterSpacing: '-0.8px',
        color: '#121821',
        transformOrigin: 'top left',
        flex: 'none',
        whiteSpace: 'nowrap',
      });
    };
    if (titleSourceClone && titleTargetClone && titleSourceRect) {
      placeClone(titleSourceClone, titleSourceRect);
      styleTitleClone(titleSourceClone, titleSource);
      deck.appendChild(titleSourceClone);
    }
    move.target.style.visibility = 'hidden';
    if (titleTarget) titleTarget.style.visibility = 'hidden';
    transitioning = true;
    show(targetIndex);
    requestAnimationFrame(() => {
      const targetRect = move.target.getBoundingClientRect();
      placeClone(targetClone, targetRect);
      deck.appendChild(targetClone);
      let titleTargetRect;
      if (titleTargetClone && titleTarget) {
        titleTargetRect = titleTarget.getBoundingClientRect();
        placeClone(titleTargetClone, titleTargetRect);
        styleTitleClone(titleTargetClone, titleTarget);
        deck.appendChild(titleTargetClone);
      }
      const duration = 800;
      const easing = 'cubic-bezier(.25,.1,.25,1)';
      const options = { duration, easing, fill: 'forwards' };
      const sourceAnimation = sourceClone.animate([
        { transform: 'translateX(0)' },
        { transform: `translateX(${-sourceRect.width / scale}px)` },
      ], options);
      const targetAnimation = targetClone.animate([
        { transform: `translateX(${targetRect.width / scale}px)` },
        { transform: 'translateX(0)' },
      ], options);
      const titleSourceAnimation = titleSourceClone && titleSourceRect
        ? titleSourceClone.animate([
          { transform: 'translateX(0)' },
          { transform: `translateX(${-titleSourceRect.width / scale}px)` },
        ], options)
        : null;
      const titleTargetAnimation = titleTargetClone && titleTargetRect
        ? titleTargetClone.animate([
          { transform: `translateX(${titleTargetRect.width / scale}px)` },
          { transform: 'translateX(0)' },
        ], options)
        : null;
      Promise.all([sourceAnimation.finished, targetAnimation.finished, titleSourceAnimation?.finished, titleTargetAnimation?.finished].filter(Boolean)).then(() => {
        move.target.style.visibility = '';
        if (titleTarget) titleTarget.style.visibility = '';
        sourceClone.remove();
        targetClone.remove();
        titleSourceClone?.remove();
        titleTargetClone?.remove();
        transitioning = false;
      });
    });
    return true;
  }
  function animateModelRows(from, to, targetIndex) {
    if (from.id !== 'summary' || to.id !== 'quadratic') return false;
    const selectors = ['h2', '.quadratic-model-intro'];
    const deckRect = deck.getBoundingClientRect();
    const scale = deckRect.width / deck.offsetWidth;
    const snapshot = original => {
      const rect = original.getBoundingClientRect();
      const style = getComputedStyle(original);
      const clone = original.cloneNode(true);
      ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'textAlign'].forEach(property => {
        clone.style[property] = style[property];
      });
      Object.assign(clone.style, {
        position: 'absolute', left: `${(rect.left - deckRect.left) / scale}px`,
        top: `${(rect.top - deckRect.top) / scale}px`, width: `${rect.width / scale}px`,
        height: `${rect.height / scale}px`, margin: '0', zIndex: '100', pointerEvents: 'none',
      });
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      return clone;
    };
    const outgoing = [snapshot(from.querySelector('h2'))];
    const targets = selectors.map(selector => to.querySelector(selector));
    targets.forEach(row => { row.style.visibility = 'hidden'; });
    transitioning = true;
    show(targetIndex);
    const incoming = targets.map(snapshot);
    incoming.forEach(row => { row.style.visibility = 'visible'; });
    const options = { duration: 800, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' };
    const animations = [];
    animations.push(to.querySelector('.quadratic-reveal-code').animate([
      { transform: 'translateX(1600px)' }, { transform: 'translateX(0)' },
    ], options));
    outgoing.forEach(row => {
      deck.appendChild(row);
      animations.push(row.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-1600px)' }], options));
    });
    incoming.forEach(row => {
      deck.appendChild(row);
      animations.push(row.animate([{ transform: 'translateX(1600px)' }, { transform: 'translateX(0)' }], options));
    });
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      targets.forEach(row => { row.style.visibility = ''; });
      [...outgoing, ...incoming].forEach(row => row.remove());
      animations.forEach(animation => animation.cancel());
      transitioning = false;
    });
    return true;
  }
  function animateNoiseMove(from, to, targetIndex) {
    if (from.id !== 'quadratic' || to.id !== 'noise') return false;
    const rect = deck.getBoundingClientRect();
    const scale = rect.width / deck.offsetWidth;
    const snapshot = node => {
      const bounds = node.getBoundingClientRect();
      const clone = node.cloneNode(true);
      const style = getComputedStyle(node);
      ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'].forEach(key => { clone.style[key] = style[key]; });
      Object.assign(clone.style, { position: 'absolute', left: `${(bounds.left-rect.left)/scale}px`, top: `${(bounds.top-rect.top)/scale}px`, width: `${bounds.width/scale}px`, height: `${bounds.height/scale}px`, margin: '0', visibility: 'visible', zIndex: '100', pointerEvents: 'none' });
      clone.inert = true;
      clone.setAttribute('aria-hidden', 'true');
      return clone;
    };
    const outgoing = [from.querySelector('.linear-model-intro'), from.querySelector('.explain-layout'), ...from.querySelectorAll('.quadratic-left-explanation:not([hidden]), .quadratic-comparison-results:not([hidden])')].map(node => {
      const clone = snapshot(node);
      [node, ...node.querySelectorAll('*')].forEach((original, i) => {
        const target = [clone, ...clone.querySelectorAll('*')][i];
        const style = getComputedStyle(original);
        ['display', 'gridTemplateColumns', 'gap', 'padding', 'fontSize', 'fontWeight', 'lineHeight', 'boxSizing', 'textAlign'].forEach(key => { target.style[key] = style[key]; });
      });
      return clone;
    });
    const source = from.querySelector('.quadratic-model-intro').getBoundingClientRect();
    const targets = [to.querySelector('.noise-model-source'), to.querySelector('.noise-plot-instruction'), to.querySelector('#quadratic-curvature-demo')];
    targets.forEach(node => { node.style.visibility = 'hidden'; });
    transitioning = true;
    show(targetIndex);
    // Animate the actual SVG container: cloning duplicates clip-path IDs and
    // loses selector context, producing a flash when swapping back.
    const incoming = targets.slice(0, 2).map(snapshot);
    targets[2].style.visibility = 'visible';
    const destination = targets[0].getBoundingClientRect();
    const options = { duration: 800, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' };
    const animations = [];
    outgoing.forEach(node => { deck.appendChild(node); animations.push(node.animate([{transform:'translateX(0)'},{transform:'translateX(-1600px)'}],options)); });
    animations.push(targets[2].animate([{transform:'translateX(1600px)'},{transform:'translateX(0)'}], options));
    incoming.forEach((node,i) => {
      deck.appendChild(node);
      animations.push(node.animate([{transform:i === 0 ? `translate(${(source.left-destination.left)/scale}px, ${(source.top-destination.top)/scale}px)` : 'translateX(1600px)'},{transform:'translateX(0)'}],options));
    });
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      targets.forEach(node => { node.style.visibility = ''; });
      [...outgoing,...incoming].forEach(node => node.remove());
      animations.forEach(animation => animation.cancel());
      transitioning = false;
    });
    return true;
  }
  function navigateTo(next) {
    if (transitioning) return;
    const targetIndex = Math.max(0, Math.min(slides.length - 1, next));
    const from = slides[index];
    const to = slides[targetIndex];
    if (animateNoiseMove(from, to, targetIndex)) return;
    if (animateModelRows(from, to, targetIndex)) return;
    if (animatePageMove(from, to, targetIndex)) return;
    if (animateSplitMove(from, to, targetIndex)) return;
    const move = magicMoveTarget(from, to);
    if (!move || !move.source || !move.target) { show(targetIndex); return; }

    const sourceRect = move.source.getBoundingClientRect();
    const deckRect = deck.getBoundingClientRect();
    const scale = deckRect.width / deck.offsetWidth;
    const clone = move.source.cloneNode(true);
    // Snapshot styles before hiding the source; keep the clone inside the
    // scaled deck so its typography uses the same coordinates as both slides.
    const typography = node => {
      const style = getComputedStyle(node);
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color'].map(key => [key, style[key]]));
    };
    const sourceStyle = typography(move.source);
    Object.assign(clone.style, {
      position: 'absolute',
      left: `${(sourceRect.left - deckRect.left) / scale}px`,
      top: `${(sourceRect.top - deckRect.top) / scale}px`,
      margin: '0',
      width: `${sourceRect.width / scale}px`,
      zIndex: '100',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      fontFamily: sourceStyle.fontFamily,
      fontSize: sourceStyle.fontSize,
      fontWeight: sourceStyle.fontWeight,
      lineHeight: sourceStyle.lineHeight,
      letterSpacing: sourceStyle.letterSpacing,
      color: sourceStyle.color,
    });
    clone.setAttribute('aria-hidden', 'true');
    deck.appendChild(clone);
    move.target.style.visibility = 'hidden';
    transitioning = true;
    show(targetIndex);

    requestAnimationFrame(() => {
      const targetRect = move.target.getBoundingClientRect();
      const targetStyle = typography(move.target);
      const dx = (targetRect.left - sourceRect.left) / scale;
      const dy = (targetRect.top - sourceRect.top) / scale;
      const animation = clone.animate([
        { ...sourceStyle, transform: 'translate(0, 0)' },
        { ...targetStyle, transform: `translate(${dx}px, ${dy}px)` },
      ], {
        duration: from.id === 'agenda' && to.id === 'world' ? 900 : 720,
        easing: from.id === 'agenda' && to.id === 'world' ? 'cubic-bezier(.25,.1,.25,1)' : 'cubic-bezier(.22,.61,.36,1)',
        fill: 'forwards',
      });
      animation.finished.then(() => {
        move.target.style.visibility = '';
        clone.remove();
        transitioning = false;
      });
    });
  }
  function nextSlide() {
    if (transitioning) return;
    const current = slides[index];
    if (current?.id === 'quadratic' && !current.classList.contains('reveal-quadratic-code')) {
      const code = current.querySelector('.quadratic-reveal-code');
      current.classList.add('reveal-quadratic-code');
      current.querySelector('.panel-placeholder').hidden = true;
      code.hidden = false;
      transitioning = true;
      const animation = code.animate([
        { transform: 'translateX(1600px)' }, { transform: 'translateX(0)' },
      ], { duration: 800, easing: 'cubic-bezier(.25,.1,.25,1)' });
      animation.finished.then(() => { transitioning = false; });
      return;
    }
    if (current?.id === 'quadratic' && !current.classList.contains('reveal-quadratic-results')) {
      const results = current.querySelector('.quadratic-comparison-results');
      const bottom = current.querySelector('.fit-bottom');
      const frames = [...bottom.querySelectorAll('.code-surface')];
      const scale = deck.getBoundingClientRect().width / deck.offsetWidth;
      results.style.top = `${(Math.max(...frames.map(frame => frame.getBoundingClientRect().bottom)) - bottom.getBoundingClientRect().top) / scale + 18}px`;
      results.hidden = false;
      current.classList.add('reveal-quadratic-results');
      transitioning = true;
      const animations = [...results.children].map(row => row.animate([
        { transform: 'translateX(1600px)' }, { transform: 'translateX(0)' },
      ], { duration: 800, easing: 'cubic-bezier(.25,.1,.25,1)' }));
      Promise.all(animations.map(animation => animation.finished)).then(() => { transitioning = false; });
      return;
    }
    if (current && current.id === 'falling' && !current.classList.contains('reveal-right')) {
      current.classList.add('reveal-right');
      return;
    }
    if (current && current.id === 'world' && !current.classList.contains('reveal-code')) {
      current.classList.add('reveal-code');
      return;
    }
    if (current && current.id === 'world' && !current.classList.contains('reveal-middle')) {
      current.classList.add('reveal-x', 'reveal-eps', 'reveal-middle');
      return;
    }
    navigateTo(index + 1);
  }
  function toggleNotes(open = notes.hidden) {
    notes.hidden = !open;
    notesToggle.setAttribute('aria-expanded', String(open));
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) {
      document.getElementById('fullscreen').textContent = 'Use browser full screen';
    }
  }
  document.getElementById('previous').addEventListener('click', () => show(index - 1));
  document.getElementById('next').addEventListener('click', nextSlide);
  document.getElementById('contents').addEventListener('click', () => show(1));
  notesToggle.addEventListener('click', () => toggleNotes());
  document.getElementById('close-notes').addEventListener('click', () => toggleNotes(false));
  document.getElementById('fullscreen').addEventListener('click', fullscreen);
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === 'Escape') { toggleNotes(false); return; }
    if (event.key.toLowerCase() === 'n') { toggleNotes(); return; }
    if (event.key.toLowerCase() === 'f') { fullscreen(); return; }
    if (event.key.toLowerCase() === 'c') { show(1); return; }
    // Space/Enter belong to controls and to the embedded animation code.
    if (event.key === ' ' && event.target.closest('button,summary,[role="button"],a')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); nextSlide(); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); show(index - 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
  });
  document.querySelectorAll('[data-math]').forEach(node => {
    katex.render(node.dataset.math, node, { displayMode: node.classList.contains('display'), throwOnError: true, strict: 'warn' });
  });
  function alignConstantConnectors() {
    const diagram = document.querySelector('.constant-diagram');
    if (!diagram || !diagram.getBoundingClientRect().width) return;
    const rect = diagram.getBoundingClientRect();
    const scale = rect.width / diagram.offsetWidth;
    const paths = diagram.querySelectorAll('.constant-connectors > path');
    [['.constant-square', '.constant-ones'], ['.constant-star', '.constant-xs']].forEach(([symbol, column], i) => {
      const start = diagram.querySelector(symbol).getBoundingClientRect();
      const end = diagram.querySelector(column).getBoundingClientRect();
      const sx = (start.left + start.width / 2 - rect.left) / scale;
      const sy = (start.top - rect.top) / scale - 7;
      const ex = (end.left + end.width / 2 - rect.left) / scale;
      paths[i].setAttribute('d', `M${sx} ${sy} V${250 - i * 12} H${ex} V217`);
    });
  }
  window.addEventListener('resize', alignConstantConnectors);
  function alignCoefficientCallouts() {
    const row = document.querySelector('#params .full-return');
    if (!row || !row.getBoundingClientRect().width) return;
    const rect = row.getBoundingClientRect();
    const scale = rect.width / row.offsetWidth;
    const coefficients = [...row.querySelectorAll('.constant-normal-result .katex-html .base > .mord')].filter(node => node.textContent.includes('β'));
    row.querySelectorAll('.coefficient-callout').forEach(label => {
      const coefficient = coefficients[Number(label.dataset.coefficient)];
      if (!coefficient) return;
      const target = coefficient.getBoundingClientRect();
      label.style.left = `${(target.left + target.width / 2 - rect.left) / scale}px`;
    });
  }
  window.addEventListener('resize', alignCoefficientCallouts);
  const quadraticDestination = document.querySelector('#quadratic .explanations');
  if (quadraticDestination) {
    const copy = document.createElement('div');
    copy.className = 'code-surface';
    copy.innerHTML = `<pre><code>xs = np.column_stack([x, x**2])</code></pre>
      <button class="code-trigger"><span>X = sm.add_constant(xs)</span></button>
      <button class="code-trigger"><span>model2 = sm.OLS(y, X).fit()</span></button>
      <button class="code-trigger"><span><strong>print</strong>(model2.params.round(3))</span></button>
      <button class="code-trigger summary-trigger">model2.summary()</button>`;
    copy.classList.add('quadratic-reveal-code');
    copy.hidden = true;
    const first = copy.querySelector('pre');
    const firstButton = document.createElement('button');
    firstButton.className = 'quadratic-first-trigger';
    firstButton.innerHTML = first.innerHTML;
    first.replaceWith(firstButton);
    const buttons = [firstButton, ...copy.querySelectorAll('.code-trigger')];
    buttons.forEach(button => { button.classList.add('quadratic-action'); });
    quadraticDestination.appendChild(copy);
    const slide = document.getElementById('quadratic');
    const panel = document.createElement('div');
    panel.className = 'quadratic-left-explanation';
    panel.id = 'quadratic-left-explanation';
    panel.hidden = true;
    slide.querySelector('.fit-bottom').appendChild(panel);
    const preview = document.createElement('div');
    preview.className = 'quadratic-summary-preview';
    preview.hidden = true;
    preview.setAttribute('role', 'region');
    preview.setAttribute('aria-label', 'Quadratic model summary output');
    preview.innerHTML = `<div class="summary-output"><div class="summary-result-title">OLS Regression Results — quadratic model</div>
      <table class="summary-meta-table"><tbody><tr><th>Dep. Variable</th><td>y</td><th>R-squared</th><td>0.568</td></tr><tr><th>Model</th><td>OLS</td><th>Adj. R-squared</th><td>0.559</td></tr><tr><th>No. Observations</th><td>100</td><th>Df Residuals</th><td>97</td></tr><tr><th>AIC</th><td>144.9</td><th>BIC</th><td>152.7</td></tr></tbody></table>
      <table class="summary-coef-table"><thead><tr><th></th><th>coef</th><th>std err</th><th>t</th><th>P&gt;|t|</th><th>[0.025</th><th>0.975]</th></tr></thead><tbody><tr><th>const</th><td>-0.9925</td><td>0.065</td><td>-15.315</td><td>&lt;0.001</td><td>-1.121</td><td>-0.864</td></tr><tr><th>x1</th><td>0.4929</td><td>0.044</td><td>11.277</td><td>&lt;0.001</td><td>0.406</td><td>0.580</td></tr><tr><th>x2</th><td>-0.0134</td><td>0.033</td><td>-0.403</td><td>0.688</td></tr></tbody></table></div>`;
    slide.appendChild(preview);
    const math = value => `<span class="math" data-math="${value}"></span>`;
    const results = document.createElement('div');
    results.className = 'quadratic-comparison-results';
    results.hidden = true;
    results.innerHTML = `<div>${math('\\hat y=-1.0095+0.4917x')}<p>with ${math('R^2=0.567')} and ${math('R_{\\mathrm{adj}}^2=0.562')}</p></div><div>${math('\\hat y=-0.993+0.493x-0.013x^2')}<p>with ${math('R^2=0.568')} and ${math('R_{\\mathrm{adj}}^2=0.559')}</p></div>`;
    slide.querySelector('.fit-bottom').appendChild(results);
    results.querySelectorAll('[data-math]').forEach(node => katex.render(node.dataset.math, node, { throwOnError: true }));
    const column = values => math('\\begin{matrix}' + values.map(value => value + '\\vphantom{x_{100}^2}').join('\\\\[.25em]') + '\\end{matrix}');
    const labels = `<div class="quadratic-column-labels"><span></span><span><code>x</code><br>↓</span><span><code>x**2</code><br>↓</span></div>`;
    const xsPanel = `<div class="quadratic-xs-diagram">${labels}<div class="quadratic-xs-row"><span><code>xs</code> =</span><div class="quadratic-matrix quadratic-xs-matrix">${column(['x_1','x_2','\\vdots','x_{100}'])}${column(['x_1^2','x_2^2','\\vdots','x_{100}^2'])}</div></div></div>`;
    const matrix = `<div class="quadratic-design-row"><div class="quadratic-design-prefix">${math('X=\\left[\\begin{matrix}|&|\\\\1&\\texttt{xs}\\\\|&|\\end{matrix}\\right]=')}</div><div class="quadratic-matrix quadratic-design-matrix">${column(['1','1','\\vdots','1'])}${column(['x_1','x_2','\\vdots','x_{100}'])}${column(['x_1^2','x_2^2','\\vdots','x_{100}^2'])}</div></div>`;
    const fit = `<div class="quadratic-fit-row">${math('\\text{Fit }\\hat y=')}${math('\\hat\\beta_0')}${math('+\\hat\\beta_1x')}${math('+\\hat\\beta_2x^2.')}</div>`;
    const numbers = `<div class="quadratic-fit-row quadratic-numeric-row">${math('=')}${math('-0.993')}${math('+0.493x')}${math('-0.013x^2.')}</div>`;
    buttons.forEach((button, i) => {
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => {
        if (i === 4) {
          preview.hidden = !preview.hidden;
          button.setAttribute('aria-expanded', String(!preview.hidden));
          return;
        }
        const deselect = button.getAttribute('aria-expanded') === 'true';
        preview.hidden = true;
        buttons.forEach(b => b.setAttribute('aria-expanded', 'false'));
        if (deselect) {
          slide.classList.remove('quadratic-explaining');
          panel.hidden = true;
          return;
        }
        button.setAttribute('aria-expanded', 'true');
        slide.classList.add('quadratic-explaining');
        panel.hidden = false;
        panel.classList.toggle('quadratic-design-explanation', i > 0);
        panel.innerHTML = i === 0 ? xsPanel : matrix + `<div class="quadratic-fit-slot" style="visibility:${i >= 2 ? 'visible' : 'hidden'}">${fit}</div><div class="quadratic-numeric-slot" style="visibility:${i >= 3 ? 'visible' : 'hidden'}">${numbers}</div>`;
        panel.querySelectorAll('[data-math]').forEach(node => katex.render(node.dataset.math, node, { throwOnError: true }));
      });
    });
  }
  document.querySelectorAll('.code-trigger:not(.static-code-trigger):not(.quadratic-action)').forEach(button => {
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', button.dataset.panel);
    button.addEventListener('click', () => {
      const section = button.closest('.slide');
      const open = button.getAttribute('aria-expanded') !== 'true';
      section.querySelectorAll('.code-trigger').forEach(b => b.setAttribute('aria-expanded', 'false'));
      section.querySelectorAll('.explanation').forEach(p => p.hidden = true);
      button.setAttribute('aria-expanded', String(open));
      document.getElementById(button.dataset.panel).hidden = !open;
      section.querySelector('.panel-placeholder').hidden = open;
      if (open && button.dataset.panel === 'constant') alignConstantConnectors();
      if (open && button.dataset.panel === 'params') alignCoefficientCallouts();
    });
  });
  const fitSlide = document.getElementById('fit');
  const summarySource = document.querySelector('#summary .summary-output');
  if (fitSlide && summarySource) {
    const summaryButton = document.createElement('button');
    summaryButton.className = 'code-trigger summary-trigger';
    summaryButton.textContent = 'model.summary()';
    summaryButton.setAttribute('aria-expanded', 'false');
    summaryButton.setAttribute('aria-controls', 'fit-summary-preview');
    fitSlide.querySelector('.code-surface').appendChild(summaryButton);
    const preview = document.createElement('div');
    preview.id = 'fit-summary-preview';
    preview.className = 'fit-summary-preview';
    preview.setAttribute('role', 'region');
    preview.setAttribute('aria-label', 'Model summary output');
    preview.hidden = true;
    preview.appendChild(summarySource.cloneNode(true));
    fitSlide.appendChild(preview);
    summaryButton.addEventListener('click', () => {
      preview.hidden = !preview.hidden;
      summaryButton.setAttribute('aria-expanded', String(!preview.hidden));
    });
    fitSlide.querySelectorAll('.code-trigger:not(.summary-trigger)').forEach(button => {
      button.addEventListener('click', () => {
        preview.hidden = true;
        summaryButton.setAttribute('aria-expanded', 'false');
      });
    });
  }
  document.querySelectorAll('#world .world-code-box, #fit .code-surface, #summary .code-surface, #quadratic .code-surface').forEach(box => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code-button';
    button.textContent = 'Copy Code';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    box.appendChild(button);
    button.addEventListener('click', async event => {
      event.stopPropagation();
      const code = box.matches('pre') ? box.querySelector('code').textContent :
        [...box.children].filter(node => node !== button).map(node => {
          const clone = node.cloneNode(true);
          clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          return clone.textContent.trim();
        }).join('\n');
      try {
        if (navigator.clipboard?.writeText) {
          try { await navigator.clipboard.writeText(code); }
          catch { legacyCopy(code); }
        } else { legacyCopy(code); }
        button.textContent = 'Copied!';
      } catch { button.textContent = 'Copy failed'; }
      setTimeout(() => { button.textContent = 'Copy Code'; }, 1800);
    });
  });
  function legacyCopy(code) {
    const input = document.createElement('textarea');
    input.value = code;
    Object.assign(input.style, { position: 'fixed', opacity: '0' });
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }
  resize();
  fromHash();
})();
