---
title: "Why Use the Smaller Tail?"
summary: "An optional note on the two-sided permutation p-value."
type: docs
math: true
---

## Why define the two-sided p-value as `2 × min(p_left, p_right)` instead of using `max`?

First, don’t worry about this for exams or daily use. Usually, `p_left` and `p_right` are fairly similar, say 0.009 and 0.012. So `min` and `max` often lead to the same conclusion.

But let’s dig a little deeper. What if `p_left = 0.001` and `p_right = 0.026`? Then:

- **2 × min = 0.002 → reject the assumption.**
- **2 × max = 0.052 → just fail to reject.**

Why do we use the `min`? The symbol **⇔** means “is equivalent to.”

- `2 × min < 0.05` ⇔ `p_left < 0.025` **OR** `p_right < 0.025` ⇔ **at least one direction is sufficiently extreme.**
- `2 × max < 0.05` ⇔ `p_left < 0.025` **AND** `p_right < 0.025` ⇔ **both directions must be sufficiently extreme.**

The second rule asks for more than we want: one sufficiently extreme direction is already enough evidence against our assumption. A silly analogy:

> **Assumption:** this person is innocent.
>
> **Evidence 1:** He is holding a knife covered with the victim’s blood.
>
> **Evidence 2:** He owns an old rusty gun that stopped working years ago.

Even if Evidence 2 is only borderline suspicious, Evidence 1 alone may already give us a strong reason to question the assumption. We don’t need both pieces of evidence to be equally suspicious!

This analogy is just about **OR versus AND**. In our symmetric permutation distribution, the two tails are equal in theory; the unequal values above are only a thought experiment to make the logic easier to see.
