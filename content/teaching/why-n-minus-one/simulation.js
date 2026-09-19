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
  function draw(selected = -1) {
    plot.querySelectorAll('g').forEach(el => el.remove());
    const group = svg('g', {'font-family': 'Georgia, serif', 'font-size': 15});
    plot.append(group);
    const all = samples.flat();
    const limit = Math.max(30, Math.ceil(Math.max(...all.map(Math.abs)) / 10) * 10);
    const x = value => 140 + (value + limit) / (2 * limit) * 680;
    for (const [label, y] of [['Population', 110], ['Sample', 228]]) {
      group.append(svg('text', {x: 118, y: y + 5, 'text-anchor': 'end', fill: '#505459'}, label));
      group.append(svg('line', {x1: 140, x2: 820, y1: y, y2: y, stroke: '#e1e6ed'}));
    }
    group.append(svg('line', {x1: x(0), x2: x(0), y1: 50, y2: 275, stroke: '#64748b', 'stroke-dasharray': '5 5'}));
    group.append(svg('text', {x: x(0), y: 32, 'text-anchor': 'middle', fill: '#505459'}, 'μ = 0'));
    // Deterministic stacking separates nearby dots without changing their x-values.
    function points(values, y, radius) {
      const bins = new Map();
      return values.map(value => {
        const bin = Math.round(x(value) / (2 * radius + 1));
        const count = bins.get(bin) || 0;
        bins.set(bin, count + 1);
        const offset = count === 0 ? 0 : Math.ceil(count / 2) * (count % 2 ? -1 : 1) * (radius * 2 + 1);
        return {x: x(value), y: y + offset};
      });
    }
    const populationPoints = points(all, 110, n === 100 ? 1.4 : 3.2);
    // Draw the selected dots last so they remain visible within a dense population.
    for (const active of [false, true]) populationPoints.forEach((point, i) => {
      if ((Math.floor(i / n) === selected) !== active) return;
      group.append(svg('circle', {cx: point.x, cy: point.y, r: n === 100 ? 1.4 : 3.2, fill: active ? '#306397' : 'white', stroke: active ? '#306397' : '#a5aeb9', 'stroke-width': .8}));
    });
    if (selected < 0) {
      group.append(svg('text', {x: 480, y: 256, 'text-anchor': 'middle', fill: '#7a8795'}, 'Your sample will appear here'));
      return;
    }
    const values = samples[selected];
    const mean = values.reduce((a, b) => a + b, 0) / n;
    group.append(svg('line', {x1: x(mean), x2: x(mean), y1: 183, y2: 270, stroke: '#306397', 'stroke-dasharray': '5 5'}));
    group.append(svg('text', {x: x(mean), y: 292, 'text-anchor': 'middle', fill: '#306397'}, `X̄ = ${mean.toFixed(2)}`));
    const sampleGroup = svg('g', {});
    points(values, 228, n === 100 ? 2.6 : 4).forEach(point => sampleGroup.append(svg('circle', {cx: point.x, cy: point.y, r: n === 100 ? 2.6 : 4, fill: '#306397'})));
    group.append(sampleGroup);
    if (!reducedMotion.matches) sampleGroup.animate([{opacity: 0, transform: 'translateY(-18px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 450, easing: 'ease-out'});
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
    draw();
  }
  async function fly(source, target, value) {
    if (reducedMotion.matches) { target.textContent = value; return; }
    const from = source.getBoundingClientRect(), to = target.getBoundingClientRect();
    const chip = document.createElement('span');
    chip.className = 'vsim-flying'; chip.textContent = value; chip.setAttribute('aria-hidden', 'true');
    chip.style.left = `${from.left}px`; chip.style.top = `${from.top}px`;
    document.body.append(chip);
    try {
      await chip.animate([{transform: 'translate(0, 0) scale(1)', opacity: 1}, {transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.65)`, opacity: .8}], {duration: 800, easing: 'ease-in-out', fill: 'forwards'}).finished;
    } finally { chip.remove(); target.textContent = value; }
  }
  sampleButton.addEventListener('click', async () => {
    if (busy || round >= 10) return;
    busy = true; sampleButton.disabled = true; get('size').disabled = true; get('reset').disabled = true;
    const current = round;
    draw(current);
    cards.forEach((card, i) => card.textContent = estimates[current][i].toFixed(2));
    get('status').textContent = `Sample ${current + 1}: calculating and recording both estimates…`;
    try {
      if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 550));
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
