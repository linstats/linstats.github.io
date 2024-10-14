---
title: Badminton
summary: My Badminton Journey
type: landing

cascade:
  - _target:
      kind: page
    params:
      show_breadcrumb: true

sections:
  - block: collection
    id: badminton
    content:
      title: My Badminton Journey
      filters:
        folders:
          - badminton
    design:
      view: article-grid
      columns: 3
      paginate: 10  # Set this to the desired number of posts per page
      show_all_entries: true   # Option to show all posts without a "See All" button
      pagination: false        # Disable pagination if you want to show all posts
---
