# Frontend Transfer Planner

## Overview

This project includes a frontend-only transfer planner for the delivery simulation.

The idea is simple:

- two drivers may be heading toward nearby destinations
- instead of both finishing separate but overlapping trips, one driver can hand off a package
- the handoff happens at a candidate meet point
- the receiving driver completes the consolidated route

For a hackathon, this gives a clear optimization story without needing a backend solver.

## What Counts As an Overlap

The app does not treat every nearby driver pair as a transfer opportunity.
It checks whether a transfer plan is feasible and beneficial.

A candidate plan is only kept if:

- both drivers are already delivering packages
- the sender has an in-transit package marked as transferable
- the receiver has enough remaining weight and volume capacity
- the package destination is close to the receiver's current destination
- both drivers can reach the same meet point within a small ETA gap
- the optimized route is shorter than the direct baseline after penalties

The planner evaluates a small set of fixed meet points such as delivery hubs and predefined exchange spots.

## How the Planner Works

The planner runs inside the Expo app during simulation.

1. On each simulation cycle, the app checks active drivers for transfer opportunities.
2. It compares the baseline route distance against a transfer route through a meet point.
3. It keeps the best candidate if the savings are positive enough.
4. It shows that candidate to the user as a transfer suggestion.

The current savings logic is based on:

- baseline distance: both drivers finish separately
- optimized distance: both drivers go to the meet point, then one driver completes the remaining deliveries
- penalties: transfer friction and lateness risk

## What Happens When You Accept

If the user accepts the overlap suggestion:

- one package is reassigned from the sender to the receiver
- the package owner changes immediately in simulation state
- both drivers' remaining package lists are reordered
- both drivers are rerouted to their new next destination
- the projected CO2 savings are added to the session totals

This makes the demo responsive and easy to understand.

## What the User Sees

To make the optimization obvious during a demo, the map shows:

- gray dotted lines for the original "before" routes
- blue and orange lines from each driver to the meet point
- green lines for the optimized "after" route
- a highlighted meet-point marker
- labeled destination markers
- a summary card with before, after, and saved distance

This is designed to help judges understand the idea within a few seconds.

## Why Frontend-Only

For a hackathon, keeping the planner in the frontend has a few advantages:

- no backend setup
- no deployment dependency
- easy to demo locally
- fast iteration on map visuals and transfer rules

It is not intended to be a fully general logistics optimizer.

## Current Limitation

The current implementation does not simulate a true physical rendezvous.

When a transfer is accepted, the package is reassigned instantly and both drivers are rerouted immediately.
In other words, the meet point is used as a planning and visualization concept, not yet as a full state machine with arrival, waiting, exchange, and departure.

## Next Upgrade

The strongest next improvement would be to turn the meet point into a real transfer workflow:

- both drivers travel to the meet point
- both must arrive before the handoff completes
- the package changes owner only after both vehicles are present
- the receiving driver then continues to the final destinations

That would make the simulation behavior match the visual story exactly.
