---
title: "Can Regression Recover the Truth?"
summary: "Create data with a known linear relationship, add random noise, and see how closely regression recovers the truth—and whether adding a quadratic term really helps."
date: 2026-09-13
type: docs
math: true
image:
  filename: featured.png
  caption: "Observed data, the true relationship, and a fitted quadratic curve"
tags:
  - DSA3361
  - Linear Regression
---

*Adapted from NUS DSA3361 Tutorial 4.*

Suppose we have 100 observations, \((x_1,y_1),\ldots,(x_{100},y_{100})\), and they look roughly like \(y\approx\beta_0+\beta_1x\). You may already know how to use simple linear regression to estimate \(\hat\beta_0\) and \(\hat\beta_1\), giving us the fitted equation

$$
\hat y=\hat\beta_0+\hat\beta_1x.
$$

We can use this equation to predict \(y\) for a new \(x\). But have you ever wondered:

> **Are these computed numbers reliable or not?**

Let’s make this question concrete with a familiar example: the formula for a falling object.

Suppose \(y_i\) is the distance an object has fallen, and \(x_i=t_i^2\), where \(t_i\) is the time since it started falling. If you remember a little high-school physics, you may recognise that, ignoring air resistance and starting from rest,

$$
y=\frac12gt^2=0+\frac12g x.
$$

This relationship does not come from statistics or machine learning. It comes from physics. So the true intercept is \(0\), and the true slope is \(\frac12g\), which is about \(4.9\).

But suppose you have forgotten the value of \(g\), and you want to estimate it. We can always grab a small ball, let it fall, and record its falling distance and time. This gives us a dataset. Then we fit an SLR model and obtain the fitted line \(\hat y=\hat\beta_0+\hat\beta_1x\). Since the true slope is \(\frac12g\), twice the fitted slope gives us an estimate of gravity: \(\hat g=2\hat\beta_1\).

Let’s see what this looks like in practice. We will build the dataset step by step: collect times, measure the ideal heights, add inevitable measurement error, and then fit a line.

<div class="regression-demo" style="max-width: 780px; margin: 2rem auto; padding: 1.25rem; border: 1px solid #d9e2ec; border-radius: 12px; background: #f8fafc;">
  <div style="position: relative;">
    <svg id="regression-demo-plot" viewBox="0 0 760 470" role="img" aria-labelledby="regression-demo-title regression-demo-description" style="display: block; width: 100%; height: auto; overflow: visible; background: transparent; border-radius: 8px;">
      <title id="regression-demo-title">Falling-ball data, measurement error, and fitted regression line</title>
      <desc id="regression-demo-description">A plot that first shows the distribution of observed falling times squared. The controls then reveal observed times, ideal heights, measurement error, and an animated fitted line.</desc>
    </svg>
    <div style="position: absolute; top: 9%; left: 12%; display: flex; flex-wrap: wrap; gap: 0.5rem; z-index: 2;">
      <button id="collect-time-btn" type="button" style="border: 0; border-radius: 7px; padding: 0.5rem 0.8rem; color: white; background: #2563eb; font-weight: 600; cursor: pointer;">Collect time</button>
      <button id="measure-height-btn" type="button" style="display: none; border: 0; border-radius: 7px; padding: 0.5rem 0.8rem; color: white; background: #0f766e; font-weight: 600; cursor: pointer;">Measure height</button>
      <button id="inevitable-error-btn" type="button" style="display: none; border: 0; border-radius: 7px; padding: 0.5rem 0.8rem; color: white; background: #b45309; font-weight: 600; cursor: pointer;">Inevitable error</button>
      <button id="fit-line-btn" type="button" style="display: none; border: 0; border-radius: 7px; padding: 0.5rem 0.8rem; color: white; background: #dc2626; font-weight: 600; cursor: pointer;">Fit line</button>
      <button id="restart-btn" type="button" style="display: none; border: 0; border-radius: 7px; padding: 0.5rem 0.8rem; color: white; background: #7c3aed; font-weight: 600; cursor: pointer;">Restart</button>
    </div>
  </div>
</div>

<script>
(function () {
  const svg = document.getElementById('regression-demo-plot');
  const collectTimeButton = document.getElementById('collect-time-btn');
  const measureHeightButton = document.getElementById('measure-height-btn');
  const inevitableErrorButton = document.getElementById('inevitable-error-btn');
  const fitButton = document.getElementById('fit-line-btn');
  const restartButton = document.getElementById('restart-btn');
  if (!svg || !collectTimeButton || !measureHeightButton || !inevitableErrorButton || !fitButton || !restartButton) return;

  const ns = 'http://www.w3.org/2000/svg';
  const margin = { top: 38, right: 28, bottom: 62, left: 70 };
  const width = 760;
  const height = 470;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMax = 8;
  const yMax = 45;
  const trueSlope = 4.9;
  const targetCount = 24;
  const densityScale = 95 * 2;
  const densityLift = 2.2;
  const errorStandardDeviation = 1.35 * Math.sqrt(2) * 1.5;
  let currentData = [];
  let currentFit = null;
  let experimentNumber = 0;
  let stage = 'initial';
  let trueLineOpacity = 0;
  let fittedProgress = 0;
  let animationToken = 0;
  let sceneOpacity = 1;
  let densityOpacity = 1;

  function themeColours() {
    const dark = document.documentElement.style.colorScheme === 'dark';
    return dark
      ? { background: '#17181f', axis: '#cbd5e1', text: '#e2e8f0', grid: '#334155', point: '#f8fafc', density: '#94a3b8', trueLine: '#f8fafc' }
      : { background: '#ffffff', axis: '#334155', text: '#1e293b', grid: '#e2e8f0', point: '#111827', density: '#64748b', trueLine: '#111827' };
  }

  function element(name, attributes) {
    const node = document.createElementNS(ns, name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function addText(parent, x, y, text, attributes) {
    const node = element('text', Object.assign({ x: x, y: y }, attributes || {}));
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function xScale(x) { return margin.left + (x / xMax) * plotWidth; }
  function yScale(y) { return height - margin.bottom - (y / yMax) * plotHeight; }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
  }

  function normalRandom(random) {
    const u = Math.max(random(), 1e-12);
    const v = Math.max(random(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function normalDensity(x, mean, standardDeviation) {
    const z = (x - mean) / standardDeviation;
    return Math.exp(-0.5 * z * z) / (standardDeviation * Math.sqrt(2 * Math.PI));
  }

  function makeData() {
    experimentNumber += 1;
    const random = seededRandom(3361 + experimentNumber * 7919);
    const data = [];
    while (data.length < targetCount) {
      const x = 4 + 2 * normalRandom(random);
      if (x < 0 || x > xMax) continue;
      data.push({ x: x, trueY: trueSlope * x, error: normalRandom(random) * errorStandardDeviation, y: 0 });
    }
    data.sort(function (a, b) { return a.x - b.x; });
    return data;
  }

  function fitLine(data) {
    const xMean = data.reduce(function (sum, point) { return sum + point.x; }, 0) / data.length;
    const yMean = data.reduce(function (sum, point) { return sum + point.y; }, 0) / data.length;
    const numerator = data.reduce(function (sum, point) { return sum + (point.x - xMean) * (point.y - yMean); }, 0);
    const denominator = data.reduce(function (sum, point) { return sum + Math.pow(point.x - xMean, 2); }, 0);
    const slope = numerator / denominator;
    return { intercept: yMean - slope * xMean, slope: slope };
  }

  function easeOutCubic(progress) { return 1 - Math.pow(1 - progress, 3); }

  function drawAxes() {
    const colours = themeColours();
    const axes = element('g', { 'font-family': 'system-ui, sans-serif' });
    axes.appendChild(element('line', { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: colours.axis, 'stroke-width': 1.5 }));
    axes.appendChild(element('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: colours.axis, 'stroke-width': 1.5 }));
    for (let tick = 0; tick <= 8; tick += 2) {
      const x = xScale(tick);
      axes.appendChild(element('line', { x1: x, y1: height - margin.bottom, x2: x, y2: height - margin.bottom + 6, stroke: colours.axis }));
      addText(axes, x, height - margin.bottom + 24, String(tick), { 'text-anchor': 'middle', fill: colours.text, 'font-size': 13 });
    }
    for (let tick = 0; tick <= 40; tick += 10) {
      const y = yScale(tick);
      axes.appendChild(element('line', { x1: margin.left - 6, y1: y, x2: margin.left, y2: y, stroke: colours.axis }));
      addText(axes, margin.left - 12, y + 4, String(tick), { 'text-anchor': 'end', fill: colours.text, 'font-size': 13 });
      if (tick > 0) axes.appendChild(element('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: colours.grid, 'stroke-width': 1, opacity: 0.8 }));
    }
    addText(axes, margin.left + plotWidth / 2, height - 15, 'x = time² (s²)', { 'text-anchor': 'middle', fill: colours.text, 'font-size': 15, 'font-weight': 600 });
    addText(axes, 18, margin.top + plotHeight / 2, 'y = height (m)', { transform: 'rotate(-90 18 ' + (margin.top + plotHeight / 2) + ')', 'text-anchor': 'middle', fill: colours.text, 'font-size': 15, 'font-weight': 600 });
    svg.appendChild(axes);
  }

  function drawDensity(parent) {
    const colours = themeColours();
    let path = '';
    for (let x = 0; x <= xMax; x += 0.08) {
      const y = normalDensity(x, 4, 2) * densityScale;
      path += (path ? ' L ' : 'M ') + xScale(x) + ' ' + yScale(y);
    }
    parent.appendChild(element('path', { d: path, fill: 'none', stroke: colours.density, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: densityOpacity * 0.85 }));
  }

  function drawLegend() {
    const colours = themeColours();
    const legend = element('g', { 'font-family': 'system-ui, sans-serif', opacity: stage === 'initial' ? densityOpacity : sceneOpacity });
    let y = margin.top + 8;
    function lineItem(colour, label, dashed, opacity) {
      legend.appendChild(element('line', { x1: width - 310, y1: y - 4, x2: width - 290, y2: y - 4, stroke: colour, 'stroke-width': 3, 'stroke-dasharray': dashed ? '8 6' : '', opacity: opacity === undefined ? 1 : opacity }));
      addText(legend, width - 281, y, label, { fill: colours.text, 'font-size': 13 });
      y += 22;
    }
    if (stage === 'initial') lineItem(colours.density, 'Distribution of x', false, 0.85);
    if (currentData.length) {
      legend.appendChild(element('circle', { cx: width - 306, cy: y - 4, r: 4, fill: colours.point }));
      addText(legend, width - 295, y, 'Observed points', { fill: colours.text, 'font-size': 13 });
      y += 22;
    }
    if (trueLineOpacity > 0) lineItem(colours.trueLine, 'True relation', false, trueLineOpacity);
    if (currentFit) lineItem('#dc2626', 'Fitted line', true, 1);
    svg.appendChild(legend);
  }

  function drawPlot() {
    const colours = themeColours();
    while (svg.lastChild && svg.lastChild.tagName !== 'title' && svg.lastChild.tagName !== 'desc') svg.removeChild(svg.lastChild);
    svg.appendChild(element('rect', { x: 0, y: 0, width: width, height: height, fill: colours.background, rx: 8 }));
    drawAxes();
    const content = element('g', { 'font-family': 'system-ui, sans-serif' });
    if (stage === 'initial') drawDensity(content);
    currentData.forEach(function (point) {
      content.appendChild(element('circle', { cx: xScale(point.x), cy: yScale(point.y), r: 4.5, fill: colours.point, opacity: sceneOpacity * 0.85 }));
    });
    if (trueLineOpacity > 0) {
      content.appendChild(element('line', { x1: xScale(0), y1: yScale(0), x2: xScale(xMax), y2: yScale(trueSlope * xMax), stroke: colours.trueLine, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: trueLineOpacity * sceneOpacity }));
    }
    if (currentFit) {
      const startX = Math.max(0, Math.min(xMax, -currentFit.intercept / currentFit.slope));
      const endX = Math.min(xMax, Math.max(startX, (yMax - currentFit.intercept) / currentFit.slope));
      const visibleX = startX + (endX - startX) * fittedProgress;
      const visibleY = currentFit.intercept + currentFit.slope * visibleX;
      content.appendChild(element('line', { x1: xScale(startX), y1: yScale(Math.max(0, currentFit.intercept + currentFit.slope * startX)), x2: xScale(visibleX), y2: yScale(Math.max(0, visibleY)), stroke: '#dc2626', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '9 6', opacity: sceneOpacity }));
    }
    svg.appendChild(content);
    drawLegend();
    if (currentFit) {
      const intercept = (currentFit.intercept < 0 ? '-' : '') + Math.abs(currentFit.intercept).toFixed(2);
      const slopeSign = currentFit.slope >= 0 ? '+' : '-';
      const equationGroup = element('g', { 'font-family': 'system-ui, sans-serif', opacity: sceneOpacity });
      addText(equationGroup, width - 28, margin.top + 145, 'Fitted equation', { 'text-anchor': 'end', fill: colours.text, 'font-size': 14, 'font-weight': 600 });
      addText(equationGroup, width - 28, margin.top + 177, 'ŷ = ' + intercept + ' ' + slopeSign + ' ' + Math.abs(currentFit.slope).toFixed(2) + 'x', { 'text-anchor': 'end', fill: '#dc2626', 'font-size': 20, 'font-weight': 700 });
      svg.appendChild(equationGroup);
    }
  }

  function setButton(button, visible) { button.style.display = visible ? 'inline-block' : 'none'; }

  function animatePoints(target, onComplete, lineStart, lineEnd, durationOverride, easingOverride, trajectoryOverride) {
    animationToken += 1;
    const token = animationToken;
    const starts = currentData.map(function (point) { return point.y; });
    const startTime = performance.now();
    const duration = durationOverride || 900;
    const easing = easingOverride || easeOutCubic;
    function frame(now) {
      if (token !== animationToken) return;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easing(progress);
      currentData.forEach(function (point, index) {
        point.y = trajectoryOverride
          ? trajectoryOverride(point, starts[index], progress, eased)
          : starts[index] + (target(point) - starts[index]) * eased;
      });
      if (lineStart !== undefined && lineEnd !== undefined) trueLineOpacity = lineStart + (lineEnd - lineStart) * eased;
      drawPlot();
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        currentData.forEach(function (point) { point.y = target(point); });
        if (lineEnd !== undefined) trueLineOpacity = lineEnd;
        drawPlot();
        onComplete();
      }
    }
    window.requestAnimationFrame(frame);
  }

  function animateFittedLine() {
    animationToken += 1;
    const token = animationToken;
    const startTime = performance.now();
    const duration = 1100;
    fittedProgress = 0;
    function frame(now) {
      if (token !== animationToken) return;
      const progress = Math.min(1, (now - startTime) / duration);
      fittedProgress = easeOutCubic(progress);
      drawPlot();
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      }
    }
    window.requestAnimationFrame(frame);
  }

  function collectTime() {
    animationToken += 1;
    currentData = makeData();
    currentData.forEach(function (point) {
      point.densityY = normalDensity(point.x, 4, 2) * densityScale;
      point.y = point.densityY;
    });
    currentFit = null;
    fittedProgress = 0;
    trueLineOpacity = 0;
    stage = 'initial';
    sceneOpacity = 1;
    densityOpacity = 1;
    setButton(collectTimeButton, false);
    setButton(measureHeightButton, false);
    setButton(inevitableErrorButton, false);
    setButton(fitButton, false);
    setButton(restartButton, false);
    drawPlot();
    animatePoints(function (point) {
      return point.densityY;
    }, function () {
      const pauseToken = animationToken;
      window.setTimeout(function () {
        if (pauseToken !== animationToken) return;
        stage = 'times';
        densityOpacity = 0;
        drawPlot();
        animatePoints(function () { return 0; }, function () {
          setButton(measureHeightButton, true);
        });
      }, 300);
    }, undefined, undefined, 700, easeOutCubic, function (point, start, progress) {
      return point.densityY + densityLift * Math.sin(Math.PI * progress);
    });
  }

  function measureHeight() {
    setButton(measureHeightButton, false);
    stage = 'height';
    animatePoints(function (point) { return point.trueY; }, function () {
      setButton(inevitableErrorButton, true);
    }, 0, 0.42);
  }

  function addInevitableError() {
    setButton(inevitableErrorButton, false);
    stage = 'error';
    animatePoints(function (point) { return point.trueY + point.error; }, function () {
      setButton(fitButton, true);
    }, 0.42, 0.16);
  }

  function fitLineNow() {
    setButton(fitButton, false);
    currentFit = fitLine(currentData);
    fittedProgress = 0;
    stage = 'fitted';
    setButton(restartButton, true);
    animateFittedLine();
  }

  function restart() {
    animationToken += 1;
    const token = animationToken;
    const fadeOutDuration = 650;
    const fadeInDuration = 650;
    const fadeOutStart = performance.now();
    sceneOpacity = 1;
    densityOpacity = 0;
    setButton(collectTimeButton, false);
    setButton(measureHeightButton, false);
    setButton(inevitableErrorButton, false);
    setButton(fitButton, false);
    setButton(restartButton, false);

    function fadeInDensity() {
      const fadeInStart = performance.now();
      function frame(now) {
        if (token !== animationToken) return;
        const progress = Math.min(1, (now - fadeInStart) / fadeInDuration);
        sceneOpacity = 0;
        densityOpacity = easeOutCubic(progress);
        drawPlot();
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          sceneOpacity = 1;
          densityOpacity = 1;
          setButton(collectTimeButton, true);
          drawPlot();
        }
      }
      window.requestAnimationFrame(frame);
    }

    function fadeOutScene(now) {
      if (token !== animationToken) return;
      const progress = Math.min(1, (now - fadeOutStart) / fadeOutDuration);
      sceneOpacity = 1 - easeOutCubic(progress);
      densityOpacity = 0;
      drawPlot();
      if (progress < 1) {
        window.requestAnimationFrame(fadeOutScene);
      } else {
        currentData = [];
        currentFit = null;
        fittedProgress = 0;
        trueLineOpacity = 0;
        stage = 'initial';
        sceneOpacity = 0;
        densityOpacity = 0;
        drawPlot();
        fadeInDensity();
      }
    }

    window.requestAnimationFrame(fadeOutScene);
  }

  collectTimeButton.addEventListener('click', collectTime);
  measureHeightButton.addEventListener('click', measureHeight);
  inevitableErrorButton.addEventListener('click', addInevitableError);
  fitButton.addEventListener('click', fitLineNow);
  restartButton.addEventListener('click', restart);
  const themeObserver = new MutationObserver(function (mutations) { if (mutations.some(function (mutation) { return mutation.attributeName === 'style'; })) drawPlot(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  drawPlot();
}());
</script>

Try the experiment a few more times and keep track of what you get. Did you notice that \(\hat\beta_1\) changes a little each time?

<details style="margin: 1.25rem 0; padding: 0.85rem 1rem; border: 1px solid #94a3b8; border-radius: 10px;">
<summary>How should we understand this variation?</summary>

Neither our timing nor our distance measurements can be perfectly accurate. In other words, the two sides of the physics equation \(y=\frac12gt^2\) will never be recorded exactly in our dataframe.

For this exercise, let’s put all of that measurement mess into one error term, \(\epsilon_i\). We can write the model as

\[y_i=\beta_0+\beta_1x_i+\epsilon_i.\]

The errors are different each time we run the experiment. That is why the fitted line changes slightly when we collect a new dataset, and also why the points do not sit perfectly on one straight line.
</details>

In short, measurement error in each experiment means that our estimates \(\hat\beta_0\) and \(\hat\beta_1\) will not be exactly equal to the true values \(\beta_0=0\) and \(\beta_1=g/2\). But we still hope that a useful scientific method behaves sensibly: when the measurement error is not too large, OLS—or linear regression more generally—should tend to recover the underlying parameters reasonably well.

That is what we will investigate next. Let’s create a world where we know the truth and see how well regression can recover it.

---

## Generate a world where we know the truth

We generate 100 sample points from

\[
Y_i=-1+0.5X_i+\epsilon_i,\qquad i=1,\ldots,100.
\]

Here’s what each part means:

- \(X_i\) is the observed predictor, generated from \(N(0,1)\).
- \(\epsilon_i\) is a random error term generated from \(N(0,0.25)\).
- The true intercept is \(\beta_0=-1\), and the true slope is \(\beta_1=0.5\).

Let’s create these vectors in Python:

<div id="dgp-code-block">

```python
import numpy as np

np.random.seed(123)
x = np.random.normal(loc=0, scale=1, size=100)
eps = np.random.normal(loc=0, scale=np.sqrt(0.25), size=100)
y = -1 + 0.5 * x + eps
```

</div>
<style>
#dgp-code-block { position: relative; }
#dgp-code-block .copy-button { display: none !important; }
#dgp-code-block .dgp-copy-button { position: absolute; top: .4rem; right: .5rem; padding: .25rem .6rem; border-radius: 5px; background: #e5e7eb; color: #243244; cursor: pointer; }
html[style*="color-scheme: dark"] #dgp-code-block .dgp-copy-button { background: #374151; color: #e2e8f0; }
</style>

<script>
(function () {
  const block = document.getElementById('dgp-code-block');
  const code = block.querySelector('pre code');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dgp-copy-button';
  button.textContent = 'Copy';
  block.appendChild(button);
  button.addEventListener('click', async function () {
    const source = code.textContent;
    try {
      await navigator.clipboard.writeText(source);
      button.textContent = 'Copied!';
    } catch (error) {
      const field = document.createElement('textarea');
      field.value = source;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(field);
      field.select();
      button.textContent = document.execCommand('copy') ? 'Copied!' : 'Copy failed';
      field.remove();
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
}());
</script>

With `np.random.seed(123)`, the realised values (rounded to two decimal places) are below:

$$
\begin{aligned}
\texttt{x}=\begin{bmatrix}x_1\\x_2\\\vdots\\x_{100}\end{bmatrix}
= \begin{bmatrix}-1.09\\1.00\\\vdots\\-0.38\end{bmatrix} \;\;\text{and}\;\;
\texttt{eps}=\begin{bmatrix}\epsilon_1\\\epsilon_2\\\vdots\\\epsilon_{100}\end{bmatrix}
= \begin{bmatrix}0.32\\-0.99\\\vdots\\-0.11\end{bmatrix}
\end{aligned}
$$

Applying the true relation \(Y_i=-1+0.5X_i+\epsilon_i\), we obtain the response vector \(y=(y_1,\ldots,y_{100})^\mathsf{T}\). This is the world where we know the truth.

---

## Use the true model to fit the data.
Then we can fit the linear model and print the two estimates:

<div id="ols-code-explanation">

```python
import statsmodels.api as sm

X = sm.add_constant(x)
model = sm.OLS(y, X).fit()
beta0_hat, beta1_hat = model.params
print(f"beta0_hat = {beta0_hat:.4f}")
print(f"beta1_hat = {beta1_hat:.4f}")
```

<div id="constant-explanation" hidden>

Our model includes an intercept, \(Y_i=\beta_0+\beta_1X_i+\epsilon_i\). To estimate that intercept, we add a column of 1s to the predictor vector. The result is the design matrix

$$
X=\begin{bmatrix}
1 & x_1\\
1 & x_2\\
\vdots & \vdots\\
1 & x_{100}
\end{bmatrix}.
$$

The first column goes with the intercept \(\beta_0\), and the second column goes with the slope \(\beta_1\). 

Without using `sm.add_constant(x)` to create this column of 1s, we could call `sm.OLS(y, x).fit()` directly, but that would force \(\hat\beta_0=0\). Unless we have a very strong reason to assume a zero intercept—for example, the physics relation \(y=\frac12gt^2\)—we generally do not do this.

</div>

<div id="model-explanation" hidden>

In our SLR case, it finds

$$
(\hat\beta_0,\hat\beta_1)=\mathop{\arg\min}_{b_0,b_1}\sum_{i=1}^{100}(y_i-b_0-b_1x_i)^2.
$$

The formula above may look scary, but we can plug in the data we just generated: \((x_1,y_1)=(-1.09,-1.22)\), \((x_2,y_2)=(1.00,-1.49)\), \(\ldots\), and \((x_{100},y_{100})=(-0.38,-1.30)\). Then it simply says: find the \(b_0\) and \(b_1\) that make the following sum as small as possible:

$$
\begin{aligned}
(-1.22-b_0+1.09b_1)^2+(-1.49-b_0-b_1)^2+\cdots+(-1.30-b_0+0.38b_1)^2.
\end{aligned}
$$

The <code>.fit()</code> part carries out the calculation and returns the fitted model. Its <code>params</code> are the two numbers we call \(\hat\beta_0\) and \(\hat\beta_1\).

</div>

<div id="ols-output" hidden>

```text
beta0_hat = -1.0095
beta1_hat = 0.4917
```

</div>
</div>

So, using the data \((x_i,y_i)_{i=1}^{100}\), our fitted line is \(\hat y=-1.0095+0.4917x\). Looking at the coefficients, it is pretty close to the true relationship \(Y=-1+0.5X+\epsilon\). Nice! Let’s plot the data together with the true relationship and our fitted line.

<style>
#ols-code-explanation { position: relative; margin: 1rem 0; border-radius: 8px; overflow: hidden; background: #f8f8f8; }
html[style*="color-scheme: dark"] #ols-code-explanation { background: #1f2937; }
#ols-code-explanation .highlight, #ols-code-explanation pre { margin: 0 !important; background: transparent !important; }
#ols-code-explanation pre { padding-top: .35rem; padding-bottom: .35rem; }
#ols-code-explanation .highlight { padding: .5rem 0; }
#ols-code-explanation { --ols-green: #477c65; }
html[style*="color-scheme: dark"] #ols-code-explanation { --ols-green: #8ec9a9; }
#ols-code-explanation .ols-explanation-unit { margin: 0 .65rem; border-left: 3px solid transparent; }
#ols-code-explanation .ols-explanation-unit[open] { border-left-color: var(--ols-green); background: rgba(90,160,120,.07); }
#ols-code-explanation .ols-explanation-unit summary { display: list-item; list-style-position: inside; padding: .35rem .5rem; cursor: pointer; color: var(--ols-green); }
#ols-code-explanation .ols-explanation-unit summary::marker { color: var(--ols-green); }
#ols-code-explanation .ols-explanation-unit summary code { display: inline; background: transparent; white-space: pre-wrap; }
#ols-code-explanation .ols-explanation-unit summary code::before, #ols-code-explanation .ols-explanation-unit summary code::after { content: none; }
#ols-code-explanation .ols-explanation-unit summary .line { display: inline; }
#ols-code-explanation .ols-output-unit summary code { display: inline-block; vertical-align: top; }
#ols-code-explanation .ols-output-unit summary .line { display: block; }
#ols-code-explanation .ols-output-unit .ols-explanation-body { margin: .15rem .7rem .4rem 1.3rem; padding: .5rem 0 0; border-top: 1px solid rgba(90,160,120,.28); }
#ols-code-explanation .ols-output-unit .ols-explanation-body .highlight,
#ols-code-explanation .ols-output-unit .ols-explanation-body pre { padding: 0; }
#ols-code-explanation .ols-explanation-body { padding: .1rem 1rem .6rem 1.3rem; font-family: inherit; }
#ols-code-explanation .ols-explanation-body p { margin: .6rem 0; }
#ols-code-explanation .ols-explanation-unit summary:focus-visible { outline: 2px solid var(--ols-green); }
#ols-code-explanation .highlight button { display: none !important; }
#ols-code-explanation .ols-copy-all { position: absolute; z-index: 1; right: .5rem; top: .4rem; padding: .25rem .6rem; border-radius: 5px; background: #e5e7eb; color: #243244; cursor: pointer; }
#constant-explanation { padding: .5rem 1rem 1rem; }
#constant-explanation[hidden] { display: none; }
</style>

<script>
(function () {
  const root = document.getElementById('ols-code-explanation');
  const pre = root.querySelector('pre');
  const originalCode = pre.querySelector('code');
  const fullCode = originalCode.textContent;
  const nodes = [...originalCode.childNodes];
  const highlight = pre.parentElement;
  const explanations = {
    'X = sm.add_constant(x)': document.getElementById('constant-explanation'),
    'model = sm.OLS(y, X).fit()': document.getElementById('model-explanation')
  };
  const outputStart = nodes.findIndex(node => node.textContent.trim().startsWith('beta0_hat, beta1_hat = model.params'));
  const output = document.getElementById('ols-output');
  const fragment = document.createDocumentFragment();
  let currentCode;
  function startSegment() {
    const segment = pre.cloneNode(false);
    currentCode = originalCode.cloneNode(false);
    segment.appendChild(currentCode); fragment.appendChild(segment);
  }
  startSegment();
  nodes.forEach((node, index) => {
    if (outputStart !== -1 && index > outputStart) return;
    const isOutput = index === outputStart;
    const explanation = isOutput ? output : explanations[node.textContent.trim()];
    if (!explanation) { currentCode.appendChild(node); return; }
    const unit = document.createElement('details');
    unit.className = 'ols-explanation-unit' + (isOutput ? ' ols-output-unit' : '');
    const summary = document.createElement('summary');
    const code = originalCode.cloneNode(false);
    if (isOutput) nodes.slice(index).forEach(line => code.appendChild(line));
    else code.appendChild(node);
    summary.appendChild(code);
    explanation.hidden = false;
    explanation.classList.add('ols-explanation-body');
    unit.append(summary, explanation); fragment.appendChild(unit);
    startSegment();
  });
  fragment.querySelectorAll('pre').forEach(segment => {
    if (!segment.textContent.trim()) segment.remove();
  });
  highlight.replaceChildren(fragment);
  const copyAll = document.createElement('button');
  copyAll.type = 'button';
  copyAll.className = 'ols-copy-all';
  copyAll.textContent = 'Copy';
  root.prepend(copyAll);
  copyAll.addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(fullCode);
      copyAll.textContent = 'Copied!';
    } catch (error) {
      const field = document.createElement('textarea');
      field.value = fullCode;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(field); field.select();
      copyAll.textContent = document.execCommand('copy') ? 'Copied!' : 'Copy failed';
      field.remove(); copyAll.focus();
    }
    setTimeout(()=>{copyAll.textContent='Copy';},2000);
  });

}());
</script>

<div id="plotting-workspace">
<button type="button" id="plotting-copy-all">Copy code</button>

```python
import matplotlib.pyplot as plt
```

<div id="plotting-demo">
<div id="plotting-code">

```python
plt.scatter(x, y, color="black", alpha=0.75, label="Observed data")
y_pred = model.fittedvalues # Compute predicted y
order = np.argsort(x)
x_sorted, y_pred_sorted = x[order], y_pred[order]
plt.plot(x_sorted, y_pred_sorted, color="red", linestyle="--", label="Fitted line")

```

</div>

<div id="plotting-steps">
  <div class="plotting-scroll">
    <svg viewBox="0 0 960 420" role="img" aria-label="Eight data rows become observed points, then sorted predictions form a fitted line"></svg>
  </div>
  <button type="button" class="plotting-next" hidden>Restart</button>
</div>
</div>
<style>
#plotting-workspace { position: relative; margin: 1rem 0; border-radius: 8px; background: #f8f8f8; overflow: hidden; }
html[style*="color-scheme: dark"] #plotting-workspace { background: #1f2937; }
#plotting-workspace .highlight, #plotting-workspace pre { margin: 0 !important; border-radius: 0 !important; background: transparent !important; }
#plotting-workspace .highlight button, #plotting-workspace pre button { display: none !important; }
#plotting-workspace #plotting-copy-all { position: absolute; z-index: 2; top: .4rem; right: .6rem; padding: .3rem .65rem; border-radius: 5px; background: #e5e7eb; color: #243244; cursor: pointer; font-size: .85rem; }
html[style*="color-scheme: dark"] #plotting-workspace #plotting-copy-all { background: #374151; color: #e2e8f0; }
#plotting-demo { margin: 0; }
#plotting-workspace #plotting-steps { margin: 0; padding: 0 1rem; }
#plotting-code .highlight, #plotting-code pre { margin-top: 0; margin-bottom: 0; }
#plotting-code pre { padding-top: .65rem; padding-bottom: .65rem; }
#plotting-code .plotting-code-step { border: 2px solid transparent; border-radius: 5px; box-sizing: border-box; padding: 3px 6px; display: block; }
#plotting-code .plotting-code-step.active { border-color: #dc2626; cursor: pointer; background: rgba(220,38,38,.04); }
#plotting-code .plotting-code-step.active[aria-disabled="true"] { cursor: wait; }
#plotting-code .plotting-code-step:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
#plotting-steps .plotting-next[hidden] { display: none; }
#plotting-steps { --pd-text: #243244; --pd-grid: #e2e8f0; --pd-point: #111827; --pd-accent: #dc2626; --pd-panel: #f1f5f9; margin-top: .25rem; }
html[style*="color-scheme: dark"] #plotting-steps { --pd-text: #e2e8f0; --pd-grid: #475569; --pd-point: #f8fafc; --pd-accent: #f87171; --pd-panel: #252c38; }
#plotting-steps .plotting-caption, #plotting-steps .plotting-status { font-size: .85rem; margin: .7rem 0; }
#plotting-steps .plotting-status:empty { display: none; }
#plotting-steps .plotting-scroll { overflow-x: auto; }
#plotting-steps svg { width: 100%; display: block; font-family: system-ui, sans-serif; }
#plotting-steps svg text { fill: var(--pd-text); font-size: 14px; }
#plotting-steps .plotting-table text { font-size: 20px; }
#plotting-steps .plotting-next { padding: .6rem .9rem; border: 1px solid #94a3b8; border-radius: 7px; background: var(--pd-panel); color: var(--pd-text); cursor: pointer; max-width: 100%; }
#plotting-steps .plotting-next code { color: inherit; white-space: normal; }
#plotting-steps .plotting-next:disabled { cursor: wait; opacity: .55; }
</style>

<script>
(function () {
  const root = document.getElementById('plotting-steps');
  const svg = root.querySelector('svg');
  const button = root.querySelector('button');
  const codeRoot = document.getElementById('plotting-code');
  const prefixes = ['plt.scatter(', 'y_pred =', 'order =', 'x_sorted,', 'plt.plot('];
  const codeLines = prefixes.map(prefix => [...codeRoot.querySelectorAll('.line')].find(line => line.textContent.trim().startsWith(prefix)));
  let busy = false;
  function updateCode() {
    codeLines.forEach((line,i) => {
      const active = i === step;
      line.classList.add('plotting-code-step');
      line.classList.toggle('active',active);
      line.setAttribute('role','button');
      line.setAttribute('tabindex',active && !busy ? '0' : '-1');
      line.setAttribute('aria-disabled',String(!active || busy));
      line.setAttribute('aria-label','Animate: '+line.textContent.trim());
    });
    button.hidden = step !== 5;
  }
  // First eight observations from np.random.seed(123); fitted using all 100.
  const xs = [-1.0856306033,.9973454466,.2829784981,-1.5062947139,-.5786002520,1.6514365371,-2.4266792434,-.4289126289];
  const ys = [-1.221787957,-1.490271242,-.502378433,-.453995393,-1.301613117,-.157210667,-2.123564879,-2.145444170];
  const rows = xs.map((x,i) => ({i,x,y:ys[i],pred:-1.0095428767+.4917037270*x}));
  const order = rows.map(r=>r.i).sort((a,b)=>xs[a]-xs[b]);
  const ns = 'http://www.w3.org/2000/svg';
  const px = x => 575+(x+3)/5*350;
  const py = y => 350-(y+3)/4*290;
  const ry = i => 104+i*34;
  let step = 0;
  let observed, predictions, curve, source, indices, rowGroups, xHeader, yHeader;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function el(tag, attrs={}, parent=svg) {
    const n=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); parent.appendChild(n); return n;
  }
  function text(parent,x,y,value,attrs={}) {
    const n=el('text',{x,y,...attrs},parent); n.textContent=value; return n;
  }
  function tween(duration,update) {
    if(reduced.matches) { update(1); return Promise.resolve(); }
    return new Promise(resolve=>{
      const start=performance.now();
      function frame(now) { const p=Math.min(1,(now-start)/duration); update(p); if(p<1) requestAnimationFrame(frame); else resolve(); }
      requestAnimationFrame(frame);
    });
  }
  function ease(p) { return 1-Math.pow(1-p,3); }
  function table(parent) {
    el('rect',{x:10,y:16,width:450,height:347,rx:12,fill:'var(--pd-panel)',opacity:.55},parent);
    text(parent,22,42,'Original rows',{'font-weight':600,'data-table-title':''});
    text(parent,22,76,'index');
    xHeader=text(parent,133,76,'x');
    yHeader=text(parent,275,76,'y',{'data-y-header':''});
    el('line',{x1:22,y1:84,x2:430,y2:84,stroke:'var(--pd-grid)','stroke-width':1.5},parent);
    rowGroups=rows.map((r,j)=>{
      const group=el('g',{'data-row-index':r.i},parent);
      el('rect',{x:14,y:ry(j)-24,width:442,height:34,rx:5,fill:'var(--pd-panel)',opacity:(j%2===0 ? 0.34 : 0.14)},group);
      el('line',{x1:22,y1:ry(j)+9,x2:430,y2:ry(j)+9,stroke:'var(--pd-grid)'},group);
      text(group,22,ry(j),r.i);
      text(group,133,ry(j),r.x.toFixed(2));
      text(group,275,ry(j),r.y.toFixed(2),{'data-y-cell':j});
      return group;
    });
  }
  function reset() {
    svg.replaceChildren(); step=0;
    source=el('g',{'class':'plotting-table'}); table(source);
    const axes=el('g');
    el('line',{x1:575,y1:350,x2:925,y2:350,stroke:'var(--pd-text)'},axes);
    el('line',{x1:575,y1:60,x2:575,y2:350,stroke:'var(--pd-text)'},axes);
    for(let x=-3;x<=2;x++) { text(axes,px(x),373,x,{'text-anchor':'middle'}); }
    for(let y=-3;y<=1;y++) {
      el('line',{x1:575,y1:py(y),x2:925,y2:py(y),stroke:'var(--pd-grid)'},axes);
      text(axes,564,py(y)+4,y,{'text-anchor':'end'});
    }
    text(axes,750,401,'x',{'text-anchor':'middle'}); text(axes,547,48,'y');
    observed=el('g'); curve=el('g'); predictions=el('g');
    busy=false; button.disabled=false; updateCode();

  }
  async function fly(r, x0, y0, isPrediction, delay=0) {
    if(delay && !reduced.matches) await new Promise(resolve=>setTimeout(resolve,delay));
    const g=el('g');
    const label=text(g,0,0,`(${r.x.toFixed(2)}, ${(isPrediction?r.pred:r.y).toFixed(2)})`,{'text-anchor':'middle'});
    const dot=el('circle',{r:4.5,fill:isPrediction?'none':'var(--pd-point)',stroke:isPrediction?'var(--pd-accent)':'none','stroke-width':2,opacity:0},g);
    const x1=px(r.x),y1=py(isPrediction?r.pred:r.y);
    await tween(850,p=>{
      const e=ease(p);
      g.setAttribute('transform',`translate(${x0+(x1-x0)*e},${y0+(y1-y0)*e-24*Math.sin(Math.PI*p)})`);
      label.setAttribute('opacity',Math.max(0,1-p*1.7)); dot.setAttribute('opacity',Math.min(1,p*1.7));
    });
    (isPrediction?predictions:observed).appendChild(g);
  }
  async function next() {
    if(busy) return;
    busy=true; button.disabled=true; updateCode();
    if(step===0) {

      await Promise.all(rows.map((r,i)=>fly(r,240,ry(i),false,i*65)));
    } else if(step===1) {
      const cells=[source.querySelector('[data-y-header]'),...source.querySelectorAll('[data-y-cell]')];
      const incoming=[];
      const header=text(source,275,76,'y_pred'); incoming.push(header); yHeader=header;
      rows.forEach((r,i)=>incoming.push(text(rowGroups[i],275,ry(i),r.pred.toFixed(2))));
      await tween(650,p=>{
        cells.forEach(n=>{n.setAttribute('transform',`translate(${-35*ease(p)},0)`);n.setAttribute('opacity',1-p);});
        incoming.forEach(n=>{n.setAttribute('transform',`translate(${65*(1-ease(p))},0)`); n.setAttribute('opacity',p);});
      }); cells.forEach(n=>n.remove());

    } else if(step===2) {
      indices=el('g',{'class':'plotting-table'}); text(indices,470,76,'order');
      order.forEach((idx,j)=>text(indices,485,ry(j),idx));
      await tween(500,p=>{indices.setAttribute('opacity',p);indices.setAttribute('transform',`translate(${12*(1-ease(p))},0)`);});

    } else if(step===3) {
      const ranks = rows.map(r=>order.indexOf(r.i));
      await tween(1200,p=>{
        rowGroups.forEach((group,i)=>{
          const dy=(ry(ranks[i])-ry(i))*ease(p);
          group.setAttribute('transform',`translate(0,${dy})`);
        });
      });
      source.querySelector('[data-table-title]').textContent='Sorted rows';
      xHeader.textContent='x[order]'; yHeader.textContent='y_pred[order]';
      await tween(400,p=>indices.setAttribute('opacity',1-p));
      indices.remove();

    } else if(step===4) {

      // Staggered launches preserve the top-to-bottom row sequence.
      await Promise.all(order.map((idx,j)=>fly(rows[idx],240,ry(j),true,j*220)));

      const first=rows[order[0]],last=rows[order[7]];
      const line=el('line',{x1:px(first.x),y1:py(first.pred),x2:px(first.x),y2:py(first.pred),stroke:'var(--pd-accent)','stroke-width':2.5,'stroke-dasharray':'8 5'},curve);
      await tween(1100,p=>{ const e=ease(p);line.setAttribute('x2',px(first.x)+(px(last.x)-px(first.x))*e);line.setAttribute('y2',py(first.pred)+(py(last.pred)-py(first.pred))*e); });
      text(svg,585,25,'● Observed data'); text(svg,755,25,'○ Fitted values / line',{style:'fill:var(--pd-accent)'});

    } else { reset(); return; }
    step++; busy=false; button.disabled=false; updateCode();
  }
  codeLines.forEach((line,i) => {
    line.addEventListener('click',()=>{if(i===step && !busy) next();});
    line.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ') && i===step && !busy) {event.preventDefault();next();}});
  });
  button.addEventListener('click',next); reset();
}());
</script>

```python
plt.xlabel("x")
plt.ylabel("y")
plt.legend()
plt.show()
```

</div>

<script>
(function () {
  const workspace = document.getElementById('plotting-workspace');
  const copy = document.getElementById('plotting-copy-all');
  copy.addEventListener('click', async function () {
    const code = [...workspace.querySelectorAll('pre code')].map(block => block.textContent.trimEnd()).join('\n\n') + '\n';
    try {
      await navigator.clipboard.writeText(code);
      copy.textContent = 'Copied!';
    } catch (error) {
      const field = document.createElement('textarea');
      field.value = code;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      copy.focus();
      copy.textContent = copied ? 'Copied!' : 'Copy failed — try again';
    }
    window.setTimeout(() => { copy.textContent = 'Copy code'; }, 2000);
  });
}());
</script>
We can use the function `model.summary()` below to check the model’s \(R^2\). It also prints quantities with deeper statistical meaning, such as the \(t\)- and \(F\)-test statistics, AIC, and BIC. If you are curious about what all these numbers mean, you are very welcome to take ST3131 — by the end of that course, you will know this whole table inside out 😊.

<details id="summary-code-box">
<summary><span class="summary-code-lines"><span class="summary-recall"># Recall: model = sm.OLS(y, X).fit()</span><span>model.summary()</span></span></summary>
<div class="summary-table-output">
<div class="summary-result-title">OLS Regression Results</div>
<table class="summary-meta-table"><tbody>
<tr><th>Dep. Variable</th><td>y</td><th>R-squared</th><td>0.567</td></tr>
<tr><th>Model</th><td>OLS</td><th>Adj. R-squared</th><td>0.562</td></tr>
<tr><th>Method</th><td>Least Squares</td><th>F-statistic</th><td>128.3</td></tr>
<tr><th>Prob (F-statistic)</th><td>1.66e-19</td><th>Log-Likelihood</th><td>-69.520</td></tr>
<tr><th>No. Observations</th><td>100</td><th>Df Residuals</th><td>98</td></tr>
<tr><th>Df Model</th><td>1</td><th>Covariance Type</th><td>nonrobust</td></tr>
<tr><th>AIC</th><td>143.0</td><th>BIC</th><td>148.3</td></tr>
</tbody></table>
<table class="summary-coef-table"><thead><tr><th></th><th>coef</th><th>std err</th><th>t</th><th>P&gt;|t|</th></tr></thead><tbody>
<tr><th>const</th><td>-1.0095</td><td>0.049</td><td>-20.603</td><td>&lt;0.001</td></tr>
<tr><th>x1</th><td>0.4917</td><td>0.043</td><td>11.325</td><td>&lt;0.001</td></tr>
</tbody></table>
</div>
</details>
<style>
#summary-code-box { margin: .9rem 0; border-radius: 7px; background: #f8f8f8; color: #243244; overflow: hidden; }
#summary-code-box[open] { border-left: 3px solid #477c65; background: #f3f8f5; }
#summary-code-box summary { position: relative; display: block; padding: .7rem 1rem; cursor: pointer; list-style: none; color: #243244; }
#summary-code-box summary::-webkit-details-marker { display: none; }
#summary-code-box summary::before { content: '▸'; position: absolute; left: 1rem; top: calc(.7rem + 1.4rem + .15rem); color: #477c65; font-size: 1.2rem; line-height: 1.3; }
#summary-code-box[open] summary::before { content: '▾'; }
#summary-code-box .summary-code-lines { display: flex; flex-direction: column; gap: .15rem; margin-left: 1.2rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 1rem; line-height: 1.4; }
#summary-code-box .summary-recall { color: #6b7280; font-weight: 400; }
#summary-code-box .summary-table-output { margin: 0 1rem 1rem 2.25rem; padding-top: .65rem; border-top: 1px solid rgba(90,160,120,.28); overflow-x: auto; }
#summary-code-box .summary-result-title { font-weight: 650; text-align: center; margin-bottom: .5rem; }
#summary-code-box table { width: 100%; min-width: 420px; margin: 0 0 .65rem; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .78rem; background: transparent; }
#summary-code-box th, #summary-code-box td { padding: .3rem .45rem; border: 0; background: transparent; white-space: nowrap; }
#summary-code-box .summary-meta-table th { text-align: left; font-weight: 500; }
#summary-code-box .summary-meta-table td { text-align: right; }
#summary-code-box .summary-coef-table { border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; }
#summary-code-box .summary-coef-table thead { border-bottom: 1px solid #94a3b8; }
#summary-code-box .summary-coef-table th:first-child { text-align: left; }
#summary-code-box .summary-coef-table th:not(:first-child), #summary-code-box .summary-coef-table td { text-align: right; }
html[style*="color-scheme: dark"] #summary-code-box { background: #1f2937; color: #e2e8f0; }
html[style*="color-scheme: dark"] #summary-code-box[open] { border-left-color: #8ec9a9; background: #202c29; }
html[style*="color-scheme: dark"] #summary-code-box summary { color: #e2e8f0; }
html[style*="color-scheme: dark"] #summary-code-box summary::before { color: #8ec9a9; }
html[style*="color-scheme: dark"] #summary-code-box .summary-recall { color: #9ca3af; }
</style>


---

## What if our used model is wrong?
In practice, for a dataset we have collected, who knows the true relationship leh? We usually try several plausible models and compare how they perform. For our example, the true relationship is \(Y=-1+0.5X+\epsilon\). Now suppose we accidentally choose a quadratic model,

\[
\hat y=\hat\beta_0+\hat\beta_1x+\hat\beta_2x^2,
\]

and let’s see what happens. The data \(x\) and \(y\) are already available from above, so we can create the extra predictor \(x^2\), fit the model, and inspect its summary:
<div id="quadratic-code-workspace">

```python
# Recall: x and y are already generated above.

x1 = x
x2 = x**2

X_predictors = np.column_stack([x1, x2])

X = sm.add_constant(X_predictors)

model2 = sm.OLS(y, X).fit()
```

<div id="quadratic-regressors-explanation" hidden>

<p>
When we fit a model with multiple regressors, we store each regressor as a separate column.
Here, <code>x1</code> contains the values of \(x\), while <code>x2</code> contains the corresponding values of \(x^2\):
</p>

<div class="quadratic-math">$$\texttt{x1}=\begin{bmatrix}x_1\\x_2\\\vdots\\x_{100}\end{bmatrix},\qquad\texttt{x2}=\begin{bmatrix}x_1^2\\x_2^2\\\vdots\\x_{100}^2\end{bmatrix}.$$</div>

<p>
So although <code>x2</code> is created from <code>x1</code>, the computer will later treat them as two separate regressors.
</p>

</div>

<div id="quadratic-stack-explanation" hidden>

<p>
We first use <code>np.column_stack([x1, x2])</code> to place
<code>x1</code> and <code>x2</code> side by side as two columns:
</p>

<div class="quadratic-math">$$\texttt{X\_predictors}\xlongequal{\text{in Python}}\begin{bmatrix}\big| & \big|\\\texttt{x1} & \texttt{x2}\\\big| & \big|\end{bmatrix}\xlongequal{\text{in practice}}\begin{bmatrix}x_1 & x_1^2\\x_2 & x_2^2\\\vdots & \vdots\\x_{100} & x_{100}^2\end{bmatrix}.$$</div>

<p>
Each row corresponds to one observation, while each column corresponds to one regressor.
</p>

</div>

<div id="quadratic-constant-explanation" hidden>

<p>
Next, we use <code>sm.add_constant(X_predictors)</code> to add a column of 1s:
</p>

<div class="quadratic-math">$$\texttt{X}\xlongequal{\text{in Python}}\begin{bmatrix}\big| & \big| & \big|\\1 & \texttt{x1} & \texttt{x2}\\\big| & \big| & \big|\end{bmatrix}\xlongequal{\text{in practice}}\begin{bmatrix}1 & x_1 & x_1^2\\1 & x_2 & x_2^2\\\vdots & \vdots & \vdots\\1 & x_{100} & x_{100}^2\end{bmatrix}.$$</div>

<p>
Why do we need this extra column of 1s? Keep reading — the next line will make its role clear.
</p>

</div>

<div id="quadratic-model-explanation" hidden>

<p>
When we run <code>sm.OLS(y, X).fit()</code>, <code>statsmodels</code> treats each column of
\(X\) as one regressor used to explain the response \(y\).
</p>

<p>Here,</p>

<div class="quadratic-math">$$y=\begin{bmatrix}y_1\\y_2\\\vdots\\y_{100}\end{bmatrix},\qquad X=\begin{bmatrix}1 & x_1 & x_1^2\\1 & x_2 & x_2^2\\\vdots & \vdots & \vdots\\1 & x_{100} & x_{100}^2\end{bmatrix}.$$</div>

<p>
Therefore, the three columns of \(X\) correspond to the three terms in
</p>

<div class="quadratic-math">$$\hat y=\hat\beta_0\cdot 1+\hat\beta_1x+\hat\beta_2x^2.$$</div>

<p>
In other words, the column of 1s gives us the intercept,
the <code>x1</code> column gives us the \(x\) term,
and the <code>x2</code> column gives us the \(x^2\) term.
</p>

</div>

<div id="quadratic-summary-output" hidden>

<div class="summary-table-output">

<div class="summary-result-title">OLS Regression Results</div>

<table class="summary-meta-table">
<tbody>

<tr>
<th>Dep. Variable</th>
<td>y</td>
<th>R-squared</th>
<td>0.568</td>
</tr>

<tr>
<th>Model</th>
<td>OLS</td>
<th>Adj. R-squared</th>
<td>0.559</td>
</tr>

<tr>
<th>Method</th>
<td>Least Squares</td>
<th>F-statistic</th>
<td>63.66</td>
</tr>

<tr>
<th>Prob (F-statistic)</th>
<td>2.19e-18</td>
<th>Log-Likelihood</th>
<td>-69.436</td>
</tr>

<tr>
<th>No. Observations</th>
<td>100</td>
<th>Df Residuals</th>
<td>97</td>
</tr>

<tr>
<th>Df Model</th>
<td>2</td>
<th>Covariance Type</th>
<td>nonrobust</td>
</tr>

<tr>
<th>AIC</th>
<td>144.9</td>
<th>BIC</th>
<td>152.7</td>
</tr>

</tbody>
</table>

<table class="summary-coef-table">
<thead>
<tr>
<th></th>
<th>coef</th>
<th>std err</th>
<th>t</th>
<th>P&gt;|t|</th>
</tr>
</thead>

<tbody>

<tr>
<th>const</th>
<td>-0.9925</td>
<td>0.065</td>
<td>-15.315</td>
<td>&lt;0.001</td>
</tr>

<tr>
<th>x1</th>
<td>0.4929</td>
<td>0.044</td>
<td>11.277</td>
<td>&lt;0.001</td>
</tr>

<tr>
<th>x2</th>
<td>-0.0134</td>
<td>0.033</td>
<td>-0.403</td>
<td>0.688</td>
</tr>

</tbody>
</table>

</div>

</div>

</div>

<style>

#quadratic-code-workspace {
  position: relative;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f8f8;
  --ols-green: #477c65;
}

html[style*="color-scheme: dark"] #quadratic-code-workspace {
  background: #1f2937;
  --ols-green: #8ec9a9;
}

#quadratic-code-workspace .highlight,
#quadratic-code-workspace pre {
  margin: 0 !important;
  background: transparent !important;
}

#quadratic-code-workspace pre {
  padding-top: .35rem;
  padding-bottom: .35rem;
}

#quadratic-code-workspace .highlight {
  padding: .5rem 0;
}

#quadratic-code-workspace .highlight button {
  display: none !important;
}

#quadratic-code-workspace .quadratic-copy-all {
  position: absolute;
  z-index: 2;
  right: .5rem;
  top: .4rem;
  padding: .25rem .6rem;
  border-radius: 5px;
  background: #e5e7eb;
  color: #243244;
  cursor: pointer;
}

html[style*="color-scheme: dark"] #quadratic-code-workspace .quadratic-copy-all {
  background: #374151;
  color: #e2e8f0;
}

#quadratic-code-workspace .ols-explanation-unit {
  margin: 0 .65rem;
  border-left: 3px solid transparent;
}

#quadratic-code-workspace .ols-explanation-unit[open] {
  border-left-color: var(--ols-green);
  background: rgba(90, 160, 120, .07);
}

#quadratic-code-workspace .ols-explanation-unit summary {
  display: list-item;
  list-style-position: inside;
  padding: .35rem .5rem;
  cursor: pointer;
  color: var(--ols-green);
}

#quadratic-code-workspace .ols-explanation-unit summary::marker {
  color: var(--ols-green);
}

#quadratic-code-workspace .ols-explanation-unit summary code {
  display: inline;
  background: transparent;
  white-space: pre-wrap;
}

#quadratic-code-workspace .ols-explanation-unit summary code::before,
#quadratic-code-workspace .ols-explanation-unit summary code::after {
  content: none;
}

#quadratic-code-workspace .ols-explanation-unit summary .line {
  display: inline;
}

#quadratic-code-workspace .ols-explanation-unit summary .ols-grouped-lines {
  display: inline-block;
  vertical-align: top;
}

#quadratic-code-workspace .ols-explanation-unit summary .ols-grouped-lines .line {
  display: block;
}

#quadratic-code-workspace .ols-explanation-body {
  padding: .1rem 1rem .6rem 1.3rem;
  font-family: inherit;
}

#quadratic-code-workspace .ols-explanation-body p {
  margin: .6rem 0;
}

#quadratic-code-workspace .ols-explanation-unit summary:focus-visible {
  outline: 2px solid var(--ols-green);
}

#quadratic-code-workspace .ols-output-unit .ols-explanation-body {
  margin: .15rem .7rem .4rem 1.3rem;
  padding: .5rem 0 0;
  border-top: 1px solid rgba(90, 160, 120, .28);
}

#quadratic-code-workspace .summary-table-output {
  overflow-x: auto;
  color: #243244;
}

#quadratic-code-workspace .summary-result-title {
  font-weight: 650;
  text-align: center;
  margin-bottom: .5rem;
}

#quadratic-code-workspace table {
  width: 100%;
  min-width: 420px;
  margin: 0 0 .65rem;
  border-collapse: collapse;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .78rem;
  background: transparent;
}

#quadratic-code-workspace th,
#quadratic-code-workspace td {
  padding: .3rem .45rem;
  border: 0;
  background: transparent;
  white-space: nowrap;
}

#quadratic-code-workspace .summary-meta-table th {
  text-align: left;
  font-weight: 500;
}

#quadratic-code-workspace .summary-meta-table td {
  text-align: right;
}

#quadratic-code-workspace .summary-coef-table {
  border-top: 1px solid #94a3b8;
  border-bottom: 1px solid #94a3b8;
}

#quadratic-code-workspace .summary-coef-table thead {
  border-bottom: 1px solid #94a3b8;
}

#quadratic-code-workspace .summary-coef-table th:first-child {
  text-align: left;
}

#quadratic-code-workspace .summary-coef-table th:not(:first-child),
#quadratic-code-workspace .summary-coef-table td {
  text-align: right;
}

html[style*="color-scheme: dark"] #quadratic-code-workspace .summary-table-output {
  color: #e2e8f0;
}

</style>

<script>

(function () {

  const root = document.getElementById('quadratic-code-workspace');

  const highlight = root && root.querySelector('.highlight');

  const pre = highlight && root.querySelector('pre');

  const code = pre && pre.querySelector('code');

  if (!root || !highlight || !pre || !code) return;

  const fullCode = code.textContent + 'model2.summary()\n';

  const nodes = [...code.childNodes];

  const explanations = {

    'x2 = x**2':
      document.getElementById('quadratic-regressors-explanation'),

    'X_predictors = np.column_stack([x1, x2])':
      document.getElementById('quadratic-stack-explanation'),

    'X = sm.add_constant(X_predictors)':
      document.getElementById('quadratic-constant-explanation'),

    'model2 = sm.OLS(y, X).fit()':
      document.getElementById('quadratic-model-explanation')

  };

  const fragment = document.createDocumentFragment();

  let currentCode;

  function startSegment() {

    const segment = pre.cloneNode(false);

    currentCode = code.cloneNode(false);

    segment.appendChild(currentCode);

    fragment.appendChild(segment);

  }

  function makeUnit(line, explanation, isOutput = false) {

    const unit = document.createElement('details');

    unit.className =
      'ols-explanation-unit' +
      (isOutput ? ' ols-output-unit' : '');

    const summary = document.createElement('summary');

    const summaryCode = code.cloneNode(false);

    summaryCode.appendChild(line);

    summary.appendChild(summaryCode);

    explanation.hidden = false;

    explanation.classList.add('ols-explanation-body');

    unit.append(summary, explanation);

    fragment.appendChild(unit);

  }

  startSegment();

  nodes.forEach((node, index) => {

    if (node.textContent.trim() === 'x1 = x' &&
        nodes[index + 1]?.textContent.trim() === 'x2 = x**2') {

      const groupedLines = document.createElement('span');

      groupedLines.className = 'ols-grouped-lines';

      groupedLines.append(node, nodes[index + 1]);

      makeUnit(
        groupedLines,
        explanations['x2 = x**2']
      );

      startSegment();

      return;

    }

    if (node.textContent.trim() === 'x2 = x**2' &&
        nodes[index - 1]?.textContent.trim() === 'x1 = x') return;

    const explanation = explanations[node.textContent.trim()];

    if (!explanation) {
      currentCode.appendChild(node);
      return;
    }

    makeUnit(node, explanation);

    startSegment();

  });

  fragment.querySelectorAll('pre').forEach(segment => {

    if (!segment.textContent.trim()) {
      segment.remove();
    }

  });

  const summaryLine = document.createElement('span');

  summaryLine.className = 'line';

  summaryLine.textContent = 'model2.summary()';

  makeUnit(
    summaryLine,
    document.getElementById('quadratic-summary-output'),
    true
  );

  highlight.replaceChildren(fragment);

  // These explanation blocks are moved into the code panel after the page's
  // initial KaTeX pass. Ask the same renderer to typeset their math once the
  // deferred KaTeX script is ready.
  function renderQuadraticMath() {

    if (!window.renderMathInElement) return;

    window.renderMathInElement(root, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderQuadraticMath, {once: true});
  } else {
    renderQuadraticMath();
  }

  const copy = document.createElement('button');

  copy.type = 'button';

  copy.className = 'quadratic-copy-all';

  copy.textContent = 'Copy';

  root.prepend(copy);

  copy.addEventListener('click', async function () {

    try {

      await navigator.clipboard.writeText(fullCode);

      copy.textContent = 'Copied!';

    } catch (error) {

      const field = document.createElement('textarea');

      field.value = fullCode;

      field.style.cssText =
        'position:fixed;left:-9999px;top:0';

      document.body.appendChild(field);

      field.select();

      copy.textContent =
        document.execCommand('copy')
          ? 'Copied!'
          : 'Copy failed';

      field.remove();

    }

    setTimeout(() => {
      copy.textContent = 'Copy';
    }, 2000);

  });

}());

</script>

Therefore, the fitted quadratic model is \(
\hat y=-0.9925+0.4929x-0.0134x^2.\) The \(t\)-test suggests that the coefficient of \(x^2\), \(\beta_2\), is not significantly different from \(0\) (Curious? ST3131 covers this😊), and the adjusted \(R^2\) does not improve. In other words, **adding a more complex term did not meaningfully improve the model.**

<details style="margin: 1.25rem 0; padding: 0.85rem 1rem; border: 1px solid #94a3b8; border-radius: 10px;">

<summary><strong>How can we plot the fitted quadratic curve?</strong></summary>

<p>
  Just like what we did for the linear model:
  get the fitted pairs \((x_i,\hat y_i)\) from <code>model2.fittedvalues</code>
  &rarr; sort them by \(x_i\) from smallest to largest
  &rarr; connect the fitted points from left to right.
</p>

```python
y_pred2 = model2.fittedvalues

order = np.argsort(x)

plt.scatter(x, y, color="black", alpha=0.75, label="Observed data")

plt.plot(
    x[order],
    y_pred2[order],
    color="red",
    linestyle="--",
    label="Fitted quadratic curve"
)

plt.xlabel("x")
plt.ylabel("y")
plt.legend()
plt.show()
```

<p>The fitted curve looks also straight here. But what we actually get is a curve. </p>
<div id="quadratic-curvature-demo">
  <div class="curve-controls">
    <button id="curve-less-noise" type="button">− ε variance</button>
    <button id="curve-more-noise" type="button">+ ε variance</button>
    <button id="curve-reset" type="button">Reset</button>
  </div>
  <div class="curve-readout" aria-live="polite">
    <span>Var(ε) = <strong id="curve-variance">0.2500</strong></span>
    <span>β̂₂ = <strong id="curve-b2-value">−0.0134</strong></span>
  </div>
  <p id="curve-equation">ŷ = −0.9925 + 0.4929x − 0.0134x²</p>
  <svg viewBox="0 0 760 460" role="img" aria-labelledby="curve-title curve-description">
    <title id="curve-title">Refit the quadratic model under different error variances</title>
    <desc id="curve-description">Observed data generated from a linear relationship and a red quadratic curve refitted after each new draw of the errors.</desc>
    <defs><clipPath id="curve-clip"><rect x="64" y="55" width="666" height="345"/></clipPath></defs>
    <g id="curve-axes"></g>
    <g clip-path="url(#curve-clip)"><g id="curve-points"></g><path id="curve-reference" fill="none" stroke="#94a3b8" stroke-width="3"/><path id="curve-adjusted" fill="none" stroke="var(--curve-red)" stroke-width="2.5" stroke-dasharray="8 5"/></g>
    <g font-size="13" fill="currentColor">
      <circle cx="74" cy="22" r="4" fill="currentColor"/><text x="86" y="27">Observed data</text>
      <path d="M235 22h26" stroke="#94a3b8" stroke-width="3"/><text x="269" y="27">True relationship</text>
      <path d="M425 22h26" stroke="var(--curve-red)" stroke-width="2.5" stroke-dasharray="8 5"/><text x="459" y="27">Refitted quadratic curve</text>
    </g>
  </svg>
</div>
<style>
#quadratic-curvature-demo { --curve-red: #dc2626; color: #243244; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 1rem; margin: 1rem 0 1.5rem; }
#quadratic-curvature-demo .curve-controls { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .65rem; }
#quadratic-curvature-demo button { padding: .35rem .65rem; border: 1px solid #94a3b8; border-radius: 6px; background: transparent; color: inherit; font-size: .85rem; cursor: pointer; }
#quadratic-curvature-demo button:hover { border-color: var(--curve-red); }
#quadratic-curvature-demo :focus-visible { outline: 2px solid var(--curve-red); outline-offset: 4px; }
#quadratic-curvature-demo .curve-readout { display: flex; justify-content: center; flex-wrap: wrap; gap: .5rem 2rem; margin-top: .8rem; font-variant-numeric: tabular-nums; }
#quadratic-curvature-demo #curve-equation { margin: .8rem 0 .25rem; font-size: 1.15rem; text-align: center; font-variant-numeric: tabular-nums; }
#quadratic-curvature-demo svg { display: block; width: 100%; height: auto; }
#quadratic-curvature-demo .curve-note { margin: .4rem 0 0; font-size: .85rem; line-height: 1.5; }
html.dark #quadratic-curvature-demo, html[style*="color-scheme: dark"] #quadratic-curvature-demo { --curve-red: #f87171; color: #e2e8f0; background: #1f2937; border-color: #475569; }
</style>
<script>
(() => {
  const root = document.getElementById('quadratic-curvature-demo');
  const originalData = [[-1.0856306033005612,-1.2217879570143648],[0.9973454465835858,-1.4902712424684315],[0.28297849805199204,-0.5023784332387449],[-1.5062947139180922,-0.45399539332438876],[-0.5786002519685364,-1.3016131167000078],[1.651436537097151,-0.15721066699650474],[-2.426679243393074,-2.1235648793771977],[-0.42891262885617726,-2.1454441698239823],[1.2659362587055338,-0.15395855080207813],[-0.8667404022651016,-2.236075073140533],[-0.6788861516220543,-1.5532828748729295],[-0.09470896893689112,-0.4259197096665769],[1.4913896261242878,-0.6219136649878942],[-0.638901996684651,-1.0688265035586255],[-0.44398195964606546,-0.7156214528448476],[-0.43435127561851733,-1.0778052097612587],[2.205930082725455,-0.5825091936845764],[2.1867860889737862,-0.07284459318881384],[1.004053897878877,0.48173262013358153],[0.386186399174856,-1.8194296819113074],[0.7373685758962422,-0.7692087189849666],[1.490732028150799,-0.5306880216686543],[-0.9358338684023914,-1.4075432526526264],[1.1758290447821034,-0.03797766901533295],[-1.2538806677490124,-0.8225948498634794],[-0.6377515024534103,-1.453991947231284],[0.9071051958003014,-0.14027673711143912],[-1.4286807002259692,-1.4644702776803982],[-0.1400687201886661,-0.8328607111584327],[-0.8617548958596855,-1.712839413693079],[-0.2556193705305969,-1.6264704196532487],[-2.7985891054607244,-2.9493161090407107],[-1.771533104509847,-2.263985156954485],[-0.6998772345979173,-1.1890953293658453],[0.9274624317585825,-0.155794087556544],[-0.1736356827902158,-0.9250834174666603],[0.0028459158968110196,-1.273054590149465],[0.688222711102285,0.24709641051737974],[-0.8795363430090519,-0.6803353596887561],[0.283627323807291,-1.0351863944714412],[-0.8053665180656158,-1.8143989620256407],[-1.7276694941206072,-1.7987272699813188],[-0.390899793755101,-0.561800574350374],[0.5738058624050577,-0.5467145801704126],[0.3385890509998015,-0.5524311220450773],[-0.01183049447881976,-1.1119553083772227],[2.392365265937726,0.42431808056997833],[0.4129121603087788,-0.021271694117541373],[0.9787360059373466,-0.6304663877701823],[2.2381433384979528,0.19072553550291277],[-1.2940853231612488,-1.5201344233058107],[-1.0387882102049535,-1.377531427216958],[1.7437122251229307,-0.8340883254741484],[-0.7980627352410625,-2.3374656955574786],[0.029683230303330227,-1.4949859203092544],[1.0693159694243488,-0.3813708675869915],[0.8907063912931706,-0.27771872135180903],[1.754886181981109,-0.3878941888962576],[1.4956441370334692,0.436450809950388],[1.0693926697057368,-0.5368916523102252],[-0.7727087142471915,-1.3761963580062835],[0.7948626677932181,-0.6995506013797221],[0.31427199450686705,-0.7758506063732339],[-1.326265459940456,-1.3108956929484261],[1.4172990464768525,0.04147624219459184],[0.8072365345785665,-1.045593203015512],[0.045490080631097156,-0.21542307144518769],[-0.2330920609844135,-1.6640592592056656],[-1.198301144700787,-1.5595370653050873],[0.19952407355863258,-1.0374362499818601],[0.46843911944564426,-1.2902762789364215],[-0.8311549842432792,-1.4531377861085553],[1.1622040490995293,-0.7893048620964345],[-1.0972030464830342,-1.512147901603491],[-2.1231003500424417,-1.8600071944115375],[1.0397270908927005,0.25582822993298604],[-0.4033660381021075,-1.0479909097373463],[-0.12602958531301514,-1.3686274628089201],[-0.8375167228250533,-1.6145682667723273],[-1.6059627607174027,-1.7329923273014196],[1.2552373747242185,-0.3256508979068152],[-0.6888689838469215,-0.6146398578092502],[1.6609524881479396,0.5281527089524471],[0.8073081862107286,-0.7758138700157664],[-0.31475814671745994,-1.431700137451829],[-1.0859024011268665,-2.8214785025973628],[-0.732461986720457,-1.6406912000213387],[-1.2125231310951696,-2.0952904185897268],[2.0871133595881854,-0.13385554925331664],[0.16444123022982496,-0.721987263710032],[1.1502055425466322,-0.33630106412718996],[-1.2673520490102275,-1.648660028028885],[0.18103512959700385,-0.8096913796572413],[1.177861938808578,-0.47412791721120684],[-0.335010761933016,-1.0689959146947698],[1.0311144589217425,-2.099970274498785],[-1.0845679120057665,-1.6769307008782606],[-1.363471544618584,-1.7371611328357957],[0.37940061207813613,-0.9809305520642249],[-0.3791764345725522,-1.298561348337747]];
  const ns = 'http://www.w3.org/2000/svg';
  const sx = x => 64 + (x + 3) / 6 * 666;
  const sy = y => 400 - (y + 7) / 12 * 345;
  function add(parent, tag, attrs, text) {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    if (text !== undefined) el.textContent = text;
    parent.append(el); return el;
  }
  const axes = root.querySelector('#curve-axes');
  for (let y=-6; y<=4; y+=2) {
    add(axes,'line',{x1:64,x2:730,y1:sy(y),y2:sy(y),stroke:'currentColor',opacity:.12});
    add(axes,'text',{x:53,y:sy(y)+5,'text-anchor':'end',fill:'currentColor','font-size':14},y);
  }
  for (let x=-3;x<=3;x++) add(axes,'text',{x:sx(x),y:424,'text-anchor':'middle',fill:'currentColor','font-size':14},x);
  add(axes,'path',{d:'M64 55V400H730',fill:'none',stroke:'currentColor',opacity:.65});
  add(axes,'text',{x:397,y:451,'text-anchor':'middle',fill:'currentColor','font-size':17},'x');
  add(axes,'text',{x:22,y:230,'text-anchor':'middle',fill:'currentColor','font-size':17},'y');
  const points = root.querySelector('#curve-points');
  let variance = 0.25;
  function fitQuadratic(data) {
    const matrix = Array.from({length:3},()=>Array(4).fill(0));
    data.forEach(([x,y]) => {
      const row=[1,x,x*x];
      for (let i=0;i<3;i++) {
        for (let j=0;j<3;j++) matrix[i][j] += row[i]*row[j];
        matrix[i][3] += row[i]*y;
      }
    });
    for (let col=0;col<3;col++) {
      let pivot=col;
      for (let row=col+1;row<3;row++) if (Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col])) pivot=row;
      [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
      const divisor=matrix[col][col];
      for (let j=col;j<4;j++) matrix[col][j]/=divisor;
      for (let row=0;row<3;row++) if (row!==col) {
        const factor=matrix[row][col];
        for (let j=col;j<4;j++) matrix[row][j]-=factor*matrix[col][j];
      }
    }
    return matrix.map(row=>row[3]);
  }
  function normal() {
    const u=Math.max(Number.EPSILON,Math.random());
    const v=Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }
  function curve(beta) {
    return Array.from({length:241},(_,i) => {
      const x=-3+i/40;
      const y=beta[0]+beta[1]*x+beta[2]*x*x;
      return `${i?'L':'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`;
    }).join(' ');
  }
  function signed(value) {
    return `${value<0?'−':'+'} ${Math.abs(value).toFixed(4)}`;
  }
  function render(data) {
    const beta=fitQuadratic(data);
    points.replaceChildren();
    data.forEach(([x,y])=>add(points,'circle',{cx:sx(x),cy:sy(y),r:3.3,fill:'currentColor',opacity:.75}));
    root.querySelector('#curve-variance').textContent=variance.toFixed(4);
    root.querySelector('#curve-b2-value').textContent=beta[2].toFixed(4).replace('-','−');
    root.querySelector('#curve-equation').textContent=`ŷ = ${beta[0].toFixed(4).replace('-','−')} ${signed(beta[1])}x ${signed(beta[2])}x²`;
    root.querySelector('#curve-adjusted').setAttribute('d',curve(beta));
  }
  function resample() {
    const data=originalData.map(([x])=>[x,-1+0.5*x+Math.sqrt(variance)*normal()]);
    render(data);
  }
  root.querySelector('#curve-reference').setAttribute('d',curve([-1,0.5,0]));
  root.querySelector('#curve-less-noise').addEventListener('click',()=>{variance=Math.max(0.03125,variance/2);resample();});
  root.querySelector('#curve-more-noise').addEventListener('click',()=>{variance=Math.min(2,variance*2);resample();});
  root.querySelector('#curve-reset').addEventListener('click',()=>{variance=0.25;render(originalData);});
  render(originalData);
})();
</script>

</details>


---

## Takeaway: what did we do today?

Today, we started with a world where the true relationship was known:

\[
Y_i=-1+0.5X_i+\epsilon_i.
\]

We then did three things:

- We generated data from this known relationship.

- We fitted the correct linear model and found that \(\hat\beta_0=-1.01\) and \(\hat\beta_1=0.49\) recovered the underlying relationship reasonably well.

- We then added an unnecessary quadratic term \(x^2\). It did not meaningfully improve the model, reminding us that a more complicated model is not automatically a better one.

So, back to the title:

> **Can regression recover the truth?**

In this simulated world, yes. When the true relationship is linear and the noise is not too large, linear regression can recover the underlying relationship reasonably well from the observed data.

More generally, what we did today is called a **simulation study**. We first decide how the world works, generate data from that known data-generating mechanism, apply statistical methods, and then check how closely they recover the truth. Because the truth is known, we can directly examine quantities such as

\[
|\hat\beta-\beta|.
\]

<mark style="background-color: #fff3b0; color: #222;"><strong style="color: #222;">But real-data analysis is different:</strong> There, nobody tells us the true data-generating mechanism. We therefore cannot directly check whether “the truth” has been recovered, because quantities such as \(\beta\) are unknown.</mark>

Instead, when comparing models on real data, we have to rely on quantities that we can actually observe or estimate, such as out-of-sample \(R^2\), MSE, MAE, and other predictive or diagnostic measures. This is often called **empirical evaluation** or **real-data evaluation**.

Both **simulation studies** and **empirical evaluations** are common ways to evaluate statistical methods in research:

- **Simulation studies:** we know the truth and ask whether the method can recover it.

- **Empirical evaluations:** the truth is unknown, so we compare models using observable evidence.

<style>
  html[style*="color-scheme: dark"] .regression-demo {
    background: #17181f !important;
    border-color: #475569 !important;
  }
</style>

---

If you're a TA teaching this tutorial, here are some [companion slides](/slides/dsa3361-tutorial-4/dsa3361-tutorial-4-standalone.html) you can use alongside these notes.
