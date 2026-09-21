---
title: Teaching
summary: Courses I have taught, statistical explorations, and teaching resources.
type: landing
cascade:
  - _target:
      kind: page
    params:
      show_breadcrumb: true
sections:
  - block: collection
    id: courses
    content:
      title: Courses I Have Taught
      text: Tutorials, supplementary notes, and answers to students' questions.
      count: 0
      sort_by: teaching_order
      sort_ascending: true
      filters:
        folders: [teaching]
        category: Teaching Courses
        include_sections: true
    design:
      view: article-grid
      columns: 2
      spacing:
        padding: ['4rem', '0', '3rem', '0']
  - block: markdown
    content:
      text: '<hr>'
    design:
      spacing:
        padding: ['0', '0', '0', '0']
  - block: collection
    id: explorations-resources
    content:
      title: Foundations, Fun & Resources
      text: Explore an idea, try a simulation, or pick up a template for your own notes.
      count: 0
      sort_by: teaching_order
      sort_ascending: true
      filters:
        folders: [teaching]
        category: Teaching Explorations and Resources
    design:
      view: article-grid
      columns: 2
      spacing:
        padding: ['3rem', '0', '3rem', '0']
  - block: markdown
    content:
      text: '<hr>'
    design:
      spacing:
        padding: ['0', '0', '0', '0']
  - block: markdown
    id: topics
    content:
      title: Browse by Topics
      text: |
        <a href="/tags/probability/">Probability</a> · <a href="/tags/linear-regression/">Linear Regression</a> · <a href="/tags/permutation-test/">Permutation Test</a> · <a href="/tags/bootstrap/">Bootstrap</a> · <a href="/tags/statistics/">Statistics</a>
    design:
      spacing:
        padding: ['3rem', '0', '4rem', '0']
---
