---
title: Lecture Notes Now Available
summary: My personal lecture notes for download in PDF format.
date: 2025-01-25
type: docs
math: false
tags:
  - Singapore
image:
  caption: 'MC Decomposition'
---

Feel free to download these resources for study or reference. I hope they assist in your journey to understanding the language of data and science. These notes are for informational purposes only and reflect my personal understanding. While I strive for accuracy, I make no guarantees regarding the completeness or reliability of the content. 

By using these notes, you **acknowledge** that any reliance on the material is at your own risk. I am not responsible for any errors, omissions, or outcomes resulting from the use of this information. For official guidance or advice, please refer to relevant textbooks, authorities, or professionals in the respective field.

All notes are generated using <a href="files/hw-latex.zip" target="_blank">this custom \(\LaTeX\) template</a>, designed specifically for statistics students with helpful shortcuts. The videos in this section are produced with Keynote, the MacOS presentation software, using <a href="files/NUS-keynote.key" target="_blank">this custom template</a>. I would be very happy if they could be helpful in your homeworks or presentations!
![Latex template](files/tch-notes-fig1.png)

<div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; width: 100%;">
  <video controls style="width: 100%;">
    <source src="../coffee-sim/images/6120-v2tut-simulation.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <p style="text-align: center; width: 100%;">An Example of Keynote Template</p>
</div>

<!-- ### Machine Learning Methods

- <a href="/notes/ml-pca.pdf" target="_blank">Lecture 1: Principal Component Analysis</a>
- <a href="/notes/ml-fa.pdf" target="_blank">Lecture 2: Factor Analysis</a>
- <a href="/notes/ml-kpca.pdf" target="_blank">Lecture 3: MDS and Kernel PCA</a>
- <a href="/notes/ml-svm.pdf" target="_blank">Lecture 4: Support Vector Machine</a> -->

### Statistical Theory

- <a href="files/st-pres.pdf" target="_blank">Lecture 0: Preliminaries in Integration and Conditioning</a>




<!-- 
[Hugo Blox Builder](https://hugoblox.com) is designed to give technical content creators a seamless experience. You can focus on the content and the Hugo Blox Builder which this template is built upon handles the rest.

**Embed videos, podcasts, code, LaTeX math, and even test students!**

On this page, you'll find some examples of the types of technical content that can be rendered with Hugo Blox.

## Video

Teach your course by sharing videos with your students. Choose from one of the following approaches:

{{< youtube D2vj0WcvH5c >}}

**Youtube**:

    {{</* youtube w7Ft2ymGmfc */>}}

**Bilibili**:

    {{</* bilibili id="BV1WV4y1r7DF" */>}}

**Video file**

Videos may be added to a page by either placing them in your `assets/media/` media library or in your [page's folder](https://gohugo.io/content-management/page-bundles/), and then embedding them with the _video_ shortcode:

    {{</* video src="my_video.mp4" controls="yes" */>}}

## Podcast

You can add a podcast or music to a page by placing the MP3 file in the page's folder or the media library folder and then embedding the audio on your page with the _audio_ shortcode:

    {{</* audio src="ambient-piano.mp3" */>}}

Try it out:

{{< audio src="ambient-piano.mp3" >}}

## Test students

Provide a simple yet fun self-assessment by revealing the solutions to challenges with the `spoiler` shortcode:

```markdown
{{</* spoiler text="👉 Click to view the solution" */>}}
You found me!
{{</* /spoiler */>}}
```

renders as

{{< spoiler text="👉 Click to view the solution" >}} You found me 🎉 {{< /spoiler >}}

## Math

Hugo Blox Builder supports a Markdown extension for $\LaTeX$ math. You can enable this feature by toggling the `math` option in your `config/_default/params.yaml` file.

To render _inline_ or _block_ math, wrap your LaTeX math with `{{</* math */>}}$...${{</* /math */>}}` or `{{</* math */>}}$$...$${{</* /math */>}}`, respectively.

{{% callout note %}}
We wrap the LaTeX math in the Hugo Blox _math_ shortcode to prevent Hugo rendering our math as Markdown.
{{% /callout %}}

Example **math block**:

```latex
{{</* math */>}}
$$
\gamma_{n} = \frac{ \left | \left (\mathbf x_{n} - \mathbf x_{n-1} \right )^T \left [\nabla F (\mathbf x_{n}) - \nabla F (\mathbf x_{n-1}) \right ] \right |}{\left \|\nabla F(\mathbf{x}_{n}) - \nabla F(\mathbf{x}_{n-1}) \right \|^2}
$$
{{</* /math */>}}
```

renders as

{{< math >}}
$$\gamma_{n} = \frac{ \left | \left (\mathbf x_{n} - \mathbf x_{n-1} \right )^T \left [\nabla F (\mathbf x_{n}) - \nabla F (\mathbf x_{n-1}) \right ] \right |}{\left \|\nabla F(\mathbf{x}_{n}) - \nabla F(\mathbf{x}_{n-1}) \right \|^2}$$
{{< /math >}}

Example **inline math** `{{</* math */>}}$\nabla F(\mathbf{x}_{n})${{</* /math */>}}` renders as {{< math >}}$\nabla F(\mathbf{x}_{n})${{< /math >}}.

Example **multi-line math** using the math linebreak (`\\`):

```latex
{{</* math */>}}
$$f(k;p_{0}^{*}) = \begin{cases}p_{0}^{*} & \text{if }k=1, \\
1-p_{0}^{*} & \text{if }k=0.\end{cases}$$
{{</* /math */>}}
```

renders as

{{< math >}}

$$
f(k;p_{0}^{*}) = \begin{cases}p_{0}^{*} & \text{if }k=1, \\
1-p_{0}^{*} & \text{if }k=0.\end{cases}
$$

{{< /math >}}

## Code

Hugo Blox Builder utilises Hugo's Markdown extension for highlighting code syntax. The code theme can be selected in the `config/_default/params.yaml` file.


    ```python
    import pandas as pd
    data = pd.read_csv("data.csv")
    data.head()
    ```

renders as

```python
import pandas as pd
data = pd.read_csv("data.csv")
data.head()
```

## Inline Images

```go
{{</* icon name="python" */>}} Python
```

renders as

{{< icon name="python" >}} Python

## Did you find this page helpful? Consider sharing it 🙌 -->
