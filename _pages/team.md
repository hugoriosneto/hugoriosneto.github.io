---
layout: team
title: team
permalink: /team/
nav: true
nav_order: 1
display_categories: [Faculty, PhD-Students, MsC-Students, BA-Students, Alumni]
---

<!-- pages/team.md -->
<div class="team">
{%- if site.enable_person_categories and page.display_categories %}
    <!-- Display categorized projects -->
    {%- for category in page.display_categories %}
        <h2 class="category">{{ category | replace: '-', ' ' }}</h2>
        {%- assign categorized_people = site.team | where: "category", category -%}
        {%- assign ordered_people = categorized_people | sort: "importance" %}
        <!-- Generate cards for each person -->
        <div class="grid">
        {%- for person in ordered_people -%}
            {% include person_card.html %}
        {%- endfor %}
        </div>
    <br>
    {% endfor %}

{%- else -%}
{%- endif -%}
</div>


---

### Interested in Joining?