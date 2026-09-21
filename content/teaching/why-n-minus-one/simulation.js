(() => {
  const root = document.getElementById('variance-simulation');
  if (!root) return;
  const get = id => document.getElementById(`vsim-${id}`);
  const plot = get('plot'), sampleButton = get('sample'), averageButton = get('average');
  const rows = [get('row-n'), get('row-corrected')];
  const cards = [get('current-n'), get('current-corrected')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let samples, estimates, round, n, busy = false;
  const seeds = {5: 152, 100: 49};
  function random(seed) {
    return () => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function svg(tag, attrs, text) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
  const plotGeometry = {left: 140, right: 820, populationY: 145, sampleY: 238, limit: 40};
  const xScale = value => plotGeometry.left + (value + plotGeometry.limit) / (2 * plotGeometry.limit) * (plotGeometry.right - plotGeometry.left);
  function drawBase() {
    plot.querySelectorAll('g').forEach(el => el.remove());
    const group = svg('g', {'font-family': 'Georgia, serif', 'font-size': 15});
    plot.append(group);
    const {left, right, populationY, sampleY} = plotGeometry;
    group.append(svg('text', {x: 118, y: populationY + 5, 'text-anchor': 'end', fill: '#505459'}, 'Population'));
    group.append(svg('text', {x: 118, y: sampleY + 5, 'text-anchor': 'end', fill: '#306397'}, 'Sample'));
    group.append(svg('line', {x1: left, x2: right, y1: populationY, y2: populationY, stroke: '#aab4c0'}));
    group.append(svg('line', {x1: left, x2: right, y1: sampleY, y2: sampleY, stroke: '#e1e6ed'}));
    let densityPath = '';
    for (let value = -40; value <= 40; value += .5) {
      const density = Math.exp(-.5 * (value / 10) ** 2);
      densityPath += `${value === -40 ? 'M' : 'L'} ${xScale(value).toFixed(2)} ${(populationY - density * 78).toFixed(2)} `;
    }
    group.append(svg('path', {d: densityPath, fill: 'none', stroke: '#7d8996', 'stroke-width': 2.2}));
    group.append(svg('line', {x1: xScale(0), x2: xScale(0), y1: 38, y2: 272, stroke: '#64748b', 'stroke-dasharray': '5 5'}));
    group.append(svg('text', {x: xScale(0), y: 28, 'text-anchor': 'middle', fill: '#505459'}, 'μ = 0'));
    group.append(svg('text', {x: 480, y: sampleY + 30, 'text-anchor': 'middle', fill: '#7a8795', class: 'vsim-placeholder'}, 'Your sample will appear here'));
  }
  function pointPositions(values, y, radius) {
    const bins = new Map();
    return values.map(value => {
      const px = xScale(Math.max(-40, Math.min(40, value)));
      const bin = Math.round(px / (2 * radius + 1));
      const count = bins.get(bin) || 0;
      bins.set(bin, count + 1);
      const offset = count === 0 ? 0 : Math.ceil(count / 2) * (count % 2 ? -1 : 1) * (radius * 2 + 1);
      return {x: px, y: y + offset};
    });
  }
  async function animateSample(values, firstRound) {
    drawBase();
    plot.querySelector('.vsim-placeholder').remove();
    const group = plot.querySelector('g');
    const radius = n === 100 ? 2.5 : 4.2;
    const sampleGroup = svg('g', {class: 'vsim-sample-points'});
    pointPositions(values, plotGeometry.populationY, radius).forEach(point => sampleGroup.append(svg('circle', {cx: point.x, cy: point.y, r: radius, fill: '#306397'})));
    group.append(sampleGroup);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const timings = firstRound
      ? {appear: 500, pause: 300, move: 600, bounce: 260}
      : {appear: 400, pause: 200, move: 500, bounce: 210};
    if (!reducedMotion.matches) {
      await sampleGroup.animate([
        {opacity: 0, transform: 'translateY(0) scale(.65)'},
        {opacity: 1, transform: 'translateY(-8px) scale(1.08)', offset: .7},
        {opacity: 1, transform: 'translateY(0) scale(1)'}
      ], {duration: timings.appear, easing: 'ease-out'}).finished;
      await sleep(timings.pause);
      await sampleGroup.animate([
        {transform: 'translateY(0)'},
        {transform: `translateY(${plotGeometry.sampleY - plotGeometry.populationY}px)`}
      ], {duration: timings.move, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'}).finished;
    } else {
      sampleGroup.setAttribute('transform', `translate(0 ${plotGeometry.sampleY - plotGeometry.populationY})`);
    }
    group.append(svg('line', {x1: xScale(mean), x2: xScale(mean), y1: 188, y2: 274, stroke: '#306397', 'stroke-dasharray': '5 5'}));
    group.append(svg('text', {x: xScale(mean), y: 294, 'text-anchor': 'middle', fill: '#306397'}, `X̄ = ${mean.toFixed(2)}`));
    if (!reducedMotion.matches) {
      await sampleGroup.animate([
        {transform: `translateY(${plotGeometry.sampleY - plotGeometry.populationY}px) scale(1)`},
        {transform: `translateY(${plotGeometry.sampleY - plotGeometry.populationY - 7}px) scale(1.06)`},
        {transform: `translateY(${plotGeometry.sampleY - plotGeometry.populationY}px) scale(1)`}
      ], {duration: timings.bounce, easing: 'ease-out', fill: 'forwards'}).finished;
    }
  }
  function reset() {
    n = Number(get('size').value);
    const rng = random(seeds[n]);
    samples = Array.from({length: 10}, () => Array.from({length: n}, () => 10 * Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())));
    estimates = samples.map(values => {
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const ss = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
      return [ss / n, ss / (n - 1)];
    });
    round = 0;
    rows.forEach(row => {
      row.querySelectorAll('td:not(.vsim-average-cell)').forEach(cell => cell.remove());
      for (let i = 0; i < 10; i++) { const cell = document.createElement('td'); cell.textContent = '—'; row.insertBefore(cell, row.lastElementChild); }
    });
    cards.forEach(card => card.textContent = '—');
    sampleButton.textContent = 'Sample'; sampleButton.disabled = false;
    averageButton.disabled = true; averageButton.classList.remove('vsim-ready');
    root.querySelectorAll('.vsim-average-result').forEach(result => result.hidden = true);
    get('truth').hidden = true;
    get('count').textContent = '0 / 10 samples';
    get('status').textContent = 'Click Sample to draw your first sample.';
    drawBase();
  }
  async function fly(source, target, value) {
    if (reducedMotion.matches) { target.textContent = value; return; }
    const from = source.getBoundingClientRect(), to = target.getBoundingClientRect();
    const chip = document.createElement('span');
    chip.className = 'vsim-flying'; chip.textContent = value; chip.setAttribute('aria-hidden', 'true');
    chip.style.left = `${from.left}px`; chip.style.top = `${from.top}px`;
    document.body.append(chip);
    try {
      await chip.animate([{transform: 'translate(0, 0) scale(1)', opacity: 1}, {transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.65)`, opacity: .8}], {duration: 450, easing: 'ease-in-out', fill: 'forwards'}).finished;
    } finally { chip.remove(); target.textContent = value; }
  }
  sampleButton.addEventListener('click', async () => {
    if (busy || round >= 10) return;
    busy = true; sampleButton.disabled = true; get('size').disabled = true; get('reset').disabled = true;
    const current = round;
    cards.forEach(card => card.textContent = '—');
    get('status').textContent = `Sample ${current + 1}: drawing observations from the population…`;
    try {
      await animateSample(samples[current], current === 0);
      get('status').textContent = `Sample ${current + 1}: calculating both variance estimates…`;
      cards.forEach((card, i) => {
        card.textContent = estimates[current][i].toFixed(2);
        if (!reducedMotion.matches) card.animate([{transform: 'scale(.8)', opacity: .25}, {transform: 'scale(1.08)', opacity: 1}, {transform: 'scale(1)', opacity: 1}], {duration: current === 0 ? 280 : 220, easing: 'ease-out'});
      });
      if (!reducedMotion.matches) await sleep(current === 0 ? 280 : 220);
      rows[0].children[current + 1].scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest', inline: 'nearest'});
      await Promise.all(cards.map((card, i) => fly(card, rows[i].children[current + 1], estimates[current][i].toFixed(2))));
      round++;
      get('count').textContent = `${round} / 10 samples`;
      sampleButton.textContent = round === 10 ? '10 samples complete' : 'Resample';
      get('status').textContent = round === 10 ? 'All ten samples are in. Now calculate the average of each row!' : `Sample ${round} recorded. Click Resample for the next one.`;
      if (round === 10) { averageButton.disabled = false; averageButton.classList.add('vsim-ready'); }
    } finally { busy = false; sampleButton.disabled = round === 10; get('size').disabled = false; get('reset').disabled = false; }
  });
  averageButton.addEventListener('click', () => {
    if (round !== 10) return;
    const averages = [0, 1].map(i => estimates.reduce((sum, row) => sum + row[i], 0) / 10);
    get('average-n').textContent = averages[0].toFixed(2);
    get('average-corrected').textContent = averages[1].toFixed(2);
    root.querySelectorAll('.vsim-average-result').forEach(result => result.hidden = false);
    get('truth').hidden = false;
    averageButton.classList.remove('vsim-ready');
    get('status').textContent = `Average estimates: ${averages[0].toFixed(2)} and ${averages[1].toFixed(2)}. True variance: 100.`;
  });
  get('size').addEventListener('change', reset);
  get('reset').addEventListener('click', () => { if (!busy) reset(); });
  reset();
})();
