---
title: Statistical Analysis in Badminton
summary: Modeling service and returns in badminton men's doubles.
date: 2024-01-25
type: docs
math: false
tags:
  - Shenzhen, P.R. China
image:
  caption: 'Returning a Service'
---

Badminton doubles is a popular format among amateur players. A strong service or a well-placed service return can often determine the outcome of a rally. To assist players in making quick and accurate predictions during play, we utilized statistical tools to model and forecast service return patterns.

In short, we selected **SLA** (Service Landing Area), **Foot** (stepping foot), and **Grip** (handgrip) as predictors in our model. These variables are observable before the receiver hits the shuttle, making them key factors in predicting the return. 

All three are categorical variables, with the following reference levels:
- **SLA** = Inside
- **Foot** = Right
- **Grip** = Forehand

Let $i$ refer to the $i$-th round of data ($i = 1, 2, \ldots, n$). We define the predictor vector $\boldsymbol{x}_i$ as:

\[
\boldsymbol{x}_{i} = \begin{pmatrix}
    \text{whether } \text{SLA}_i = \text{Outside} \\
    \text{whether } \text{SLA}_i = \text{Middle} \\
    \text{whether } \text{Foot}_i = \text{Left} \\
    \text{whether } \text{Grip}_i = \text{Backhand}
\end{pmatrix},
\quad \boldsymbol{Y}_i = \begin{pmatrix}
    Y_{i1} \\
    Y_{i2} \\
    \vdots \\
    Y_{i9}
\end{pmatrix},
\]

where $Y_{ij} = I(\text{RLA}_i = \text{No. } j)$ and $\sum_{j=1}^9 Y_{ij} = 1$. The probability of each return outcome $p_{ij} = \Pr(Y_{ij}=1\mid \boldsymbol{x}_i)$ also satisfies $\sum_{j=1}^9 p_{ij}=1$.

We applied a **generalized logit model** to model these probabilities, assuming that the outcomes across rounds are independent:

\[
\boldsymbol{Y}_i \sim \text{Multinomial}\left(1, \begin{pmatrix}
    p_{i1} \\
    p_{i2} \\
    \vdots \\
    p_{i9}
\end{pmatrix}\right).
\]

The generalized logit model is defined as follows:

\[
\text{glogit}(p_{ij}) \triangleq \log\left(\frac{p_{ij}}{p_{i5}}\right) = \alpha_j + \boldsymbol{x}_i^\top \boldsymbol{\beta}_j, \quad \boldsymbol{\beta}_j = \begin{pmatrix}
    \beta_{j1} \\
    \beta_{j2} \\
    \beta_{j3} \\
    \beta_{j4}
\end{pmatrix}, \quad j = 1, 2, \ldots, 9.
\]

The term $\log\left(\frac{p_{ij}}{p_{i5}}\right)$ represents the log odds of each return outcome relative to a reference outcome (in this case, return outcome 5), and $\alpha_j$ and $\boldsymbol{\beta}_j$ are parameters estimated from the data.

____________

You can read the full paper [here](https://arxiv.org/abs/2310.18572).

For a brief presentation on the topic, you can watch the video (in Chinese) below:

<div style="max-width: 100%;">
  <iframe src="//player.bilibili.com/player.html?bvid=BV1gUx7esEr1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" width="800" height="450"> </iframe>
</div>

