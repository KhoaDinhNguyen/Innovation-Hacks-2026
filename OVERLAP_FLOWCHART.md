# Overlap Detection Flowchart

## Purpose

This flowchart describes the overlap-detection and transfer-selection algorithm at a high level.

The frontend is intentionally kept simple:

- trigger the planner when simulation state changes
- receive either `no overlap` or `transfer suggestion`
- show the suggestion to the user
- apply the accepted plan

## Flowchart

```mermaid
flowchart TD
    A[Frontend trigger] --> B[Collect active drivers and in-transit cargo]
    B --> C{At least 2 drivers in to_dropoff state?}
    C -- No --> Z[Return no overlap]
    C -- Yes --> D[Enumerate driver pairs]
    D --> E[Enumerate candidate meet points]
    E --> F[Check basic feasibility]
    F --> F1{Both drivers have active dropoffs?}
    F1 -- No --> E
    F1 -- Yes --> F2{Sender has transferable in-transit cargo?}
    F2 -- No --> E
    F2 -- Yes --> F3{Receiver has enough capacity?}
    F3 -- No --> E
    F3 -- Yes --> G[Estimate route metrics]
    G --> G1{Can both reach meet point within route limit?}
    G1 -- No --> E
    G1 -- Yes --> G2{Arrival times close enough?}
    G2 -- No --> E
    G2 -- Yes --> H[Measure destination overlap]
    H --> H1{Destinations close enough?}
    H1 -- No --> E
    H1 -- Yes --> I[Compute baseline distance]
    I --> J[Compute transfer-route distance]
    J --> K[Apply transfer and lateness penalties]
    K --> L[Compute savings]
    L --> L1{Savings > threshold?}
    L1 -- No --> E
    L1 -- Yes --> M[Store candidate plan]
    M --> N{More meet points or pairs?}
    N -- Yes --> E
    N -- No --> O{Any valid candidate?}
    O -- No --> Z
    O -- Yes --> P[Select best candidate by max savings]
    P --> Q[Return transfer suggestion to frontend]
    Q --> R{User accepts?}
    R -- No --> S[Mark dismissed and continue simulation]
    R -- Yes --> T[Reassign cargo]
    T --> U[Reorder remaining deliveries]
    U --> V[Reroute affected drivers]
    V --> W[Update savings metrics and continue simulation]
```

## Frontend Trigger

The frontend does not need to solve the overlap itself.
It only needs to call the planner when one of these events happens:

- a new package enters the simulation
- a driver picks up a package
- a driver starts a dropoff leg
- a package is delivered
- a previous transfer is accepted or dismissed
- a periodic replan interval is reached

## Decision Logic

The overlap planner can be described in this order:

1. Filter to drivers currently delivering cargo.
2. Build all driver pairs.
3. For each pair, test all candidate meet points.
4. For each meet point, test whether a sender-to-receiver handoff is feasible.
5. Reject the candidate if timing, capacity, transferability, or destination proximity fails.
6. Estimate baseline route cost.
7. Estimate transfer route cost.
8. Subtract penalties.
9. Keep only candidates with positive savings above a minimum threshold.
10. Return the best plan.

## Simplified Savings Formula

```text
savings =
  direct_distance
  - transfer_distance
  - transfer_penalty
  - lateness_penalty
```

Where:

- `direct_distance` = both drivers finish separately
- `transfer_distance` = both drivers travel to meet point + receiver completes remaining deliveries
- `transfer_penalty` = fixed friction cost to avoid unrealistic handoffs
- `lateness_penalty` = penalty if the transfer plan risks missing delivery timing

## Planner Output

The planner should return either:

### No overlap

```text
{
  status: "none"
}
```

### Transfer suggestion

```text
{
  status: "suggested",
  receiverDriverId,
  senderDriverId,
  transferPackageIds,
  meetPointId,
  meetPointLabel,
  directDistanceKm,
  optimizedDistanceKm,
  potentialSavingKm,
  potentialCO2Saving,
  arrivalWindowSec
}
```

## Hackathon Scope

To keep this stable and explainable during a demo:

- use a small number of drivers
- use a small number of packages
- use fixed meet points
- allow at most one transfer per package
- choose the best single suggestion at a time

That keeps the logic understandable and the visualization clean.
