---
title: "ST3131 Tutorial Materials"
summary: Supplementary (unofficial) notes and slides for ST3131
date: 2026-04-25
type: docs
math: true
tags:
  - Singapore
image:
  caption: "ST3131 Tutorial"
---

I served as a teaching assistant for ST3131 in AY25/26 Semester 2. While going through the course with students, I received many thoughtful questions, and I decided to organize some of them here as supplementary notes and slides.

Please note that these are **NOT** the official materials for the current offering of the course. If you rely on any of the material here, please do so at your own discretion. For official guidance, always refer to your course instructor and the current Canvas page.

#### Linear Regression Basics

If you are confused by how $\hat{\beta}$, $\mathrm{s.e.}(\hat{\beta})$, the t-value, or confidence intervals are computed in <code>R</code>, the following references may be helpful:

- <a href="files/table-SLR.pdf" target="_blank">This SLR table</a> for simple linear regression. It also includes a summary of ANOVA.
- <a href="files/table-MLR.pdf" target="_blank">This MLR table</a> for multiple linear regression. It also includes a summary of ANOVA.

#### Linear Regression Extensions

In Tutorial 3, we will encounter:

- the difference between the Confidence Interval (CI) and the Prediction Interval (PI),
- another way to interpret the coefficient $\hat{\beta}$ in the model,
- proving that $\mathrm{SampCor}(x,y)=\sqrt{R^2}$ in simple linear regression.

If you are interested, you can read <a href="files/notes-extension-in-SLR.pdf" target="_blank">this extension note</a> for Tutorial 3.

In Tutorial 6, we will go through the regression model assumptions in more detail, including what they mean and how to deal with possible violations in practice. In <a href="files/notes-model-assumptions.pdf" target="_blank">this extension note</a> for Tutorial 6, I use a dataset as a concrete example to show how these assumptions can be checked.

#### Multicollinearity

Multicollinearity can create difficulties in computation, whether in <code>R</code> or <code>Python</code>.

- <a href="files/slides-MC.pdf" target="_blank">These Tutorial 7 slides</a> introduce what multicollinearity is and why it causes trouble.
- <a href="files/slides-solve-MC.pdf" target="_blank">These Tutorial 8 slides</a> introduce how to detect multicollinearity and some common remedies.

#### Logistic Regression

Linear regression (SLR/MLR) is used when the response variable $y$ is continuous. But what should we use when facing a classification problem, for example when $y$ takes only two values such as male/female?

A natural extension is logistic regression. <a href="files/slides-logit-reg.pdf" target="_blank">These Tutorial 10 slides</a> give a quick introduction to the model, including how to fit it, perform hypothesis testing, and make predictions.
