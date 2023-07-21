---
layout: post
title:  The Tactical Influence of Analytics in Soccer
date:   2020-05-23 16:20:20
description: My first blog post at Footure, providing a brief overview of the current landscape in Soccer Analytics (this was completely new in Brazil at the time) & arguing about the tactical influence metrics such as Pitch Control can have in games.
tags: soccer implementation
categories: scientific-divulgation
---

<h4>Disclaimer</h4>

This blog post is a translation from one in <a href="https://footure.com.br/analytics-friends-of-tracking-liverpool-neuer/">Portuguese</a> I wrote for 
<a href="https://footure.com.br/">Footure</a> in 2020, using concepts I had learned from <a href="https://www.youtube.com/@friendsoftracking755">Friends of Tracking</a>. 
The point in translating the content was not to make it better & more adequate to my knowledge & understanding today, but rather have an exact translation of 
how I wrote it back then.

<h4>Introduction</h4>

During the quarantine, <a href="https://twitter.com/Soccermatics">David Sumpter</a>, an English professor and researcher at the 
University of Uppsala, Sweden, <strong>assembled a group of experts in analytics applied to football</strong>. 
Through a YouTube channel called Friends of Tracking, they aimed to <strong>make the techniques used in research accessible to the general public</strong>.

Some of the group members are <a href="https://twitter.com/the_spearman">William Spearman</a> (chief data scientist at Liverpool), 
<a href="https://twitter.com/JaviOnData">Javier Férnandez</a> (chief data scientist at Barcelona), 
<a href="https://twitter.com/suds_g">Sudarshan Gopaladesikan</a> (chief data scientist at Benfica), 
<a href="https://twitter.com/analyseFooty">Ravi Ramineni</a> (analytics director at Seattle Sounders), 
<a href="https://twitter.com/devinpleuler">Devin Pleuer</a> (chief data scientist at Toronto FC), 
<a href="https://twitter.com/EightyFivePoint">Laurie Shaw</a> (professor at the Institute for Theory and Computation at Harvard), 
<a href="https://twitter.com/JanVanHaaren">Jan Van Haaren</a> (researcher at KU Leuven, a university in Belgium), among others.

<strong>They are all leading figures in the field of analytics applied to football</strong>, an interdisciplinary area that combines techniques from computer science, 
statistics, mathematics, and physics. Compared to American sports, football still lags behind in terms of analytics development, and one of the goals 
of this initiative is to bring more people into the ecosystem.

After a few weeks of content on the channel, <strong>David Sumpter proposed a challenge</strong>: 

<blockquote>
    To prepare a quantitative analysis of how Liverpool scores goals, using some of the techniques taught by them on the channel. Optical tracking data of 19 goals scored by Liverpool in 2019 were made available.
</blockquote>

<h4>Contextualization</h4>

There are two main types of data that can be collected in football matches: <strong>event data</strong> and <strong>optical tracking data</strong>.

<strong>Event data represent events that occur during the match (pass, shot, block, etc.)</strong>. This means that for every event that occurs, the type of event, location, 
and the player who carried it out, among others, are recorded. The more detailed this data, the greater the analytical capacity. Event data is currently the 
most common in football, with many suppliers and coverage that spans various leagues around the world. However, they have a significant limitation, as the 
annotations are restricted to the agent of action. Thus, much relevant information for analysis is lost, as decision-making in football involves interpreting 
everything that occurs on the field at that moment.

The second type of data, <strong>optical tracking</strong>, solves exactly this problem, as it <strong>records the location of all players on the field at every moment of the match</strong>. 
This record is made using computer vision techniques, an area of computer science that deals with image recognition. Thus, it is possible to perform a 
quantitative analysis without losing the context of what is happening on the field. Unlike event data, tracking data does not yet have extensive coverage. 
Some leagues, like MLS (Major League Soccer), have their own providers for this type of data, but in most cases, the club itself has to seek the service. 
I believe no Brazilian club uses this technology yet. With increasingly rich data, the trend is to deepen knowledge about the game and develop new ways to 
evaluate players' actions and teams in general.

Some metrics for event data are already well established, such as xG, or expected goals. The xG is a value between 0 and 1 that tries to predict the probability 
of scoring a goal from that location. An xG value near zero indicates that it is almost impossible for a goal to be scored from that location, while an xG value 
close to 1 means the chances are high. Like any prediction model, it has its limitations.

For the analysis of the game through tracking data, <strong>William Spearman</strong> developed a metric called <strong>Pitch Control</strong>, which <strong>tries to quantify the control of space 
on the field</strong>. <strong>A player's Pitch Control in a small area of the field is the probability that this player will control the ball if it goes to that space.</strong> 
This allows us to answer a relevant question when analyzing the game: <strong>which team or player would control the ball if it were to go to an area of interest?</strong> 
Pitch Control is a predictor of the next team in possession if the ball goes to the area under analysis. A simple solution would be to assume that the 
player closest to the ball would get possession. However, this is not necessarily correct, as one player may be closer but moving in the opposite direction 
to the ball, and another further away but moving towards the ball.

The calculations made by Spearman to find out <strong>how long each player takes to reach the ball take into account position, direction, speed, acceleration, 
and maximum speed of the players</strong>. Generally speaking, the team closest to the possible new location of the ball and with more players near it will have 
a higher probability of acquiring possession if the ball is passed there.

The value of <strong>Pitch Control is a continuous variable ranging from 0 to 1, which represents the probability of the team in possession remaining in possession</strong>. 
A Pitch Control value of zero means that the team with possession has a zero probability of controlling the ball if it goes to that space, that is, the team 
without possession would get the ball. The opposite is also valid — a Pitch Control value of one means that the team with possession has a one probability of 
controlling the ball if it goes to that space, that is, it would continue with it.

If the Pitch Control was 0.7, for example, the probability of the team in possession keeping it is 0.7, and its complement, 0.3, of losing it. To calculate 
the Pitch Control for the entire field, you need to divide the field into equal small spaces and calculate the Pitch Control for each one of them. The size 
of the spaces is arbitrary, and smaller spaces imply that more calculations will be needed to generate the Pitch Control over the whole field.

In this analysis, I divided the field into squared grids with 2.1m sides, generating a 50×32 matrix. The Pitch Control value in each position of the matrix 
corresponds to the color that will be overlaid on the generated field. By calculating the Pitch Control for the entire field, you can see areas where one 
team or the other would have a higher chance of controlling the ball, and other areas where both teams have a similar probability of getting the ball. I 
will call the graph below a <strong>Pitch Control Map (PCM)</strong>.

