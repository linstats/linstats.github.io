---
title: "Tutorial 5 · Multiple Linear Regression: From Estimates to Inference"
summary: "Fit a multiple linear regression model, test individual coefficients, construct confidence intervals, and estimate the mean response for a new predictor combination."
date: 2026-09-29
draft: true
type: docs
teaching_order: 3
math: true
image:
  filename: featured.png
courses:
  - DSA3361
categories:
  - DSA3361
tags:
  - Multiple Linear Regression
  - Statistical Inference
---

[← DSA3361 course contents](/teaching/dsa3361/)

*Adapted from NUS DSA3361 Tutorial 5.*

**Download:** <a href="/teaching/dsa3361/files/tutorial-5-slides.key" download>Slides (.key)</a>

Last time, we used regression mainly to answer a point-estimation question: **what fitted coefficients do we get from the data?** This tutorial takes one step further. Once we have estimated the coefficients, we would also like to know:

> **How uncertain are these estimates, and what can we infer from them?**

We will use an American football dataset with 28 teams. The response is

- \(y\): number of games won in a 14-game season,

and we will use three predictors:

- \(x_2\): passing yards over the season,
- \(x_7\): percentage of plays that are rushing plays,
- \(x_8\): opponents' rushing yards over the season.

Let’s work through the same model from five connected perspectives: model and data, coefficient estimates, hypothesis tests, confidence intervals, and estimation of a mean response.

---

## 0. Model & Data

We model the number of games won using

\[
Y_i=\beta_0+\beta_2x_{i2}+\beta_7x_{i7}+\beta_8x_{i8}+\epsilon_i,
\qquad i=1,\ldots,28.
\]

Here, \(\beta_0,\beta_2,\beta_7,\beta_8\) are the unknown population parameters. The observed data give us only one realised sample, so our first job is to estimate them.

```python
import pandas as pd

df = pd.read_excel("../data/football.xlsx")
print(df)
```

Each row is one team, while the columns contain its season-level performance measures.

---

## 1. Estimate of \(\beta\)

We fit the multiple linear regression model using `statsmodels`:

```python
import statsmodels.api as sm

xs = df[["x2", "x7", "x8"]]
X = sm.add_constant(xs)
y = df["y"]

model = sm.OLS(y, X).fit()
model.params
```

This gives

```text
const   -1.808372
x2       0.003598
x7       0.193960
x8      -0.004815
```

Therefore, the fitted equation is

\[
\hat y = -1.8084
+0.0036x_2
+0.1940x_7
-0.0048x_8.
\]

The interpretation of a coefficient in multiple regression is always **holding the other predictors fixed**. For example, holding \(x_7\) and \(x_8\) fixed, an additional 100 passing yards (\(x_2\)) is associated with about

\[
100(0.0036)=0.36
\]

additional games won according to the fitted model.

But these are still only estimates. The next question is: **are the estimated effects distinguishable from zero, once sampling uncertainty is taken into account?**

---

## 2. Testing \(\beta=0\)

The coefficient table is available directly from the fitted model:

```python
model.summary().tables[1]
```

| term | coef | std err | \(t\) | \(p\)-value | 95% CI |
|---|---:|---:|---:|---:|---:|
| const | -1.8084 | 7.901 | -0.229 | 0.821 | \([-18.115,\ 14.498]\) |
| \(x_2\) | 0.0036 | 0.001 | 5.177 | <0.001 | \([0.002,\ 0.005]\) |
| \(x_7\) | 0.1940 | 0.088 | 2.198 | 0.038 | \([0.012,\ 0.376]\) |
| \(x_8\) | -0.0048 | 0.001 | -3.771 | 0.001 | \([-0.007,\ -0.002]\) |

For each coefficient \(\beta_j\), the usual two-sided test is

\[
H_0:\beta_j=0
\qquad\text{vs.}\qquad
H_1:\beta_j\neq 0.
\]

The test statistic is

\[
t=\frac{\hat\beta_j-0}{\operatorname{se}(\hat\beta_j)}.
\]

We have \(n=28\) observations and estimate four coefficients in total, so the residual degrees of freedom are

\[
28-4=24.
\]

Under \(H_0\), the test statistic follows a \(t_{24}\) distribution under the usual regression assumptions.

At the 5% significance level, the tests for \(x_2\), \(x_7\), and \(x_8\) all reject \(H_0\), while the intercept does not.

---

## 3. Range estimate of \(\beta\)

A hypothesis test gives a yes/no decision relative to a particular null value. A confidence interval gives us something richer: a **range of plausible values** for the coefficient.

From the same regression output, the 95% confidence intervals are

\[
\beta_2:\quad [0.002,\ 0.005],
\]

\[
\beta_7:\quad [0.012,\ 0.376],
\]

\[
\beta_8:\quad [-0.007,\ -0.002].
\]

Notice the connection with the previous section: none of these three intervals contains \(0\). That is exactly consistent with rejecting

\[
H_0:\beta_j=0
\]

in the corresponding two-sided test at the 5% level.

So the \(t\)-test and the 95% confidence interval are not two unrelated ideas. They are two ways of looking at the same sampling uncertainty.

---

## 4. (Range) estimate of \(\hat y\)

Now suppose we consider a team with

\[
x_2=2300,\qquad x_7=56.0,\qquad x_8=2100.
\]

We first create the new predictor row:

```python
x_new = pd.DataFrame({
    "const": [1],
    "x2": [2300],
    "x7": [56.0],
    "x8": [2100]
})
```

Then ask the fitted model for its prediction:

```python
pred = model.get_prediction(x_new)
pred.summary_frame(alpha=0.05)
```

The relevant output is

```text
mean            = 7.216424
mean_ci_lower   = 6.436203
mean_ci_upper   = 7.996645
obs_ci_lower    = 3.609523
obs_ci_upper    = 10.823324
```

The fitted mean response is therefore

\[
\hat y=7.2164.
\]

For the **mean number of games won** by teams with these predictor values, the 95% confidence interval is

\[
[6.4362,\ 7.9966].
\]

Be careful with the two intervals reported by `summary_frame()`:

- `mean_ci_lower` and `mean_ci_upper` give a confidence interval for the **mean response**;
- `obs_ci_lower` and `obs_ci_upper` give a prediction interval for the outcome of a **new individual observation**.

The tutorial question asks for the mean number of games won, so we use the first interval.

---

## Takeaway: what did we do today?

Everything in this tutorial comes from one fitted multiple linear regression model,

\[
Y_i=\beta_0+\beta_2x_{i2}+\beta_7x_{i7}+\beta_8x_{i8}+\epsilon_i.
\]

We first estimated the unknown coefficients with \(\hat\beta\). We then quantified their uncertainty using \(t\)-tests and confidence intervals. Finally, we used the fitted model to estimate the mean response at a new combination of predictor values.

So the progression is

\[
\text{model}
\longrightarrow
\hat\beta
\longrightarrow
\text{test } \beta
\longrightarrow
\text{CI for } \beta
\longrightarrow
\hat y \text{ and its CI}.
\]

These are not five separate tools. They are five connected ways of asking what the same regression model tells us about the population.
