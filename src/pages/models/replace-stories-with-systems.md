---
layout: ../../layouts/ModelLayout.astro
kind: "model"
idx: "M-02"
domain: "Systems"
title: "Replace Stories with Systems"
description: "A story explains. A mechanism predicts. Only one of them can be tested."
consequence: "A story explains. A mechanism predicts. Only one of them can be tested."
status: "Core"
category: "Systems Thinking"
chain: "actors ⇄ incentives ⇄ constraints ⇄ feedback"
changes: "The situation stops being about who is at fault and starts being about what the arrangement rewards."
flowMode: "lateral"
flow:
  - label: "Actors"
    note: "Who is actually in the loop — including the people nobody names."
  - label: "Incentives"
    note: "What each actor is rewarded for, not what they claim to want."
  - label: "Constraints"
    note: "Time, money, attention, permission. What cannot move."
  - label: "Feedback"
    note: "What the outcome does to the next round. This is where repetition comes from."
claims:
  - tag: "Observed"
    text: "The same outcome recurs with different people in the same arrangement."
  - tag: "Inferred"
    text: "The arrangement, not the personalities, is producing the outcome."
  - tag: "Hypothesis"
    text: "Changing one constraint changes the outcome more reliably than changing the actors."
distinctions:
  - a: "Story"
    aNote: "\"I keep messing things up.\" Complete, emotional, immovable."
    b: "System"
    bNote: "Too many inputs open → attention splits → error → frustration → more inputs."
  - a: "Blame"
    aNote: "Names a person."
    b: "Leverage"
    bNote: "Names a variable you can move."
lenses:
  - name: "Mechanism"
    prompt: "What could produce this?"
    body: "Describe it so plainly it sounds boring. If it sounds insightful, it is probably still a story."
  - name: "System"
    prompt: "What relationships produce the outcome?"
    body: "Follow the feedback: what does this result make more likely next time?"
  - name: "Scale"
    prompt: "Does the pattern change when zooming out?"
    body: "If the same failure appears across unrelated contexts, the cause is structural."
experiment:
  situation: "A team keeps missing deadlines. Everyone agrees they need to \"communicate better.\""
  ask: "Name the actors, their incentives, the constraints, and the feedback loop."
  reveal:
    - "Actors: whoever commits to dates, and whoever absorbs the overrun."
    - "Incentive: committing optimistically is rewarded now; the cost lands later, on someone else."
    - "Feedback: the overrun is absorbed quietly, so the next estimate is just as optimistic."
    - "Nobody communicated badly. The arrangement paid for optimism."
buildsOn:
  - href: "/models/seeing-before-naming"
    title: "Seeing Before Naming"
connectsTo:
  - href: "/models/from-reaction-to-pattern"
    title: "From Reaction to Pattern"
  - href: "/models/coherence-vs-entropy"
    title: "Coherence vs. Entropy"
challenges:
  - title: "That explanation is the same as understanding"
leadsTo:
  - href: "/doctrines/make-the-invisible-pattern-visible"
    title: "Make the Invisible Pattern Visible"
exits:
  - if: "If stories keep hiding the mechanism"
    explore: "Make the Invisible Pattern Visible"
    href: "/doctrines/make-the-invisible-pattern-visible"
  - if: "If you cannot yet see the repetition"
    explore: "From Reaction to Pattern"
    href: "/models/from-reaction-to-pattern"
  - if: "If you need to judge the direction of the system"
    explore: "Coherence vs. Entropy"
    href: "/models/coherence-vs-entropy"
relatedDoctrines:
  - title: "A story is a description. A system is a machine."
  - title: "You can't debug a story. You can debug a system."
  - title: "Seeing what's happening gives you a way to move."
---


<div class="card" id="core-idea">
  <h2>Core Idea</h2>
  <p>Most people explain their lives through stories ("I'm anxious," "This always happens"). Stories feel true, but they hide the mechanics of what's actually happening. This model is about seeing the system underneath the story. A story is a simple, emotional explanation. It feels complete, but it offers no room to move. A system is a step-by-step process: A leads to B, which causes C. Once you see the system, you can find a place to intervene.</p>
</div>

<div class="card" id="the-shift">
  <h2>Example: From Story to System</h2>
  <p>Moving from a personal label to an observable process.</p>
  <p><strong>The Story:</strong></p>
  <p><em>"I keep messing things up."</em></p>
  <br/>
  <p><strong>The System:</strong></p>
  <ul>
      <li><strong>State:</strong> Distracted, low energy.</li>
      <li><strong>Trigger:</strong> Too many inputs open at once.</li>
      <li><strong>Process:</strong> Attention splits, focus degrades.</li>
      <li><strong>Result:</strong> A critical mistake is made.</li>
      <li><strong>Cost:</strong> Frustration, wasted time, reinforcement of the story.</li>
  </ul>
</div>

<div class="card" id="why-it-matters">
  <h2>Why It Matters</h2>
  <p>You can't debug a story. You can debug a system. Stories often lead to feelings of helplessness ("This is just how I am"). They are identity-level declarations that offer no path forward. Systems thinking reveals leverage points. By seeing the pattern as a machine, not a personality trait, you can identify which part of the process to change—the trigger, the state, the response. This creates space for action.</p>
</div>

<div class="card" id="questions-to-ask">
    <h2>Questions That Reveal the System</h2>
    <strong>When you're stuck in a repetitive story, ask:</strong>
    <ul>
        <li>What happened *just before* this started? (The Trigger)</li>
        <li>What was my internal state like? (The State)</li>
        <li>What are the exact, step-by-step events that occur? (The Process)</li>
        <li>What is the predictable outcome? (The Result)</li>
    </ul>
</div>

<div class="card" id="failure-mode">
    <h2>Common Failure Mode</h2>
    <strong>Replacing One Story with Another</strong>
    <p>The goal is to see the mechanical reality, not to find a more sophisticated-sounding story. If your "system analysis" sounds like a psychological diagnosis or a complex narrative, it's probably still a story. A true system description is boring, observable, and almost machine-like. "When X happens, Y follows."</p>
</div>
