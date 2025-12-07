# Prompt Refinery Report: I25

**Total Cases:** 50

## Archetype Performance

| Archetype | Cases | Structural | Signals | Summary | Follow-ups | Enrichment |
|---|---|---|---|---|---|---|
| Process_Auditor | 9 | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% |
| Preventability_Detective | 9 | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% |
| Delay_Driver_Profiler | 8 | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% |
| Exclusion_Hunter | 8 | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% |
| Safety_Signal | 8 | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% |
| Documentation_Gap | 8 | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% |

## Top Failure Clusters

### signals:Extracted signal count 2 < min 3 (50 failures)
- Generated Case 1: [Process_Auditor] 6yo male with supracondylar fracture from falling off a swing, pink pulseless hand, arrived Saturday 20:00, surgery Sunday 09:00 (13h delay), Borderline.
- Generated Case 2: [Preventability_Detective] 7-year-old female with supracondylar fracture due to skateboard accident, AIN palsy, arrived Sunday 15:30, surgery Sunday 18:00 (2.5h delay), Clear Pass.
- Generated Case 3: [Delay_Driver_Profiler] 5yo male with supracondylar fracture from monkey bars fall, pucker sign, arrived Friday 17:00, surgery Saturday 11:00 (18h delay), Clear Fail.

### signals:Missing must_find_signals: presented to the emergency department on Saturday at 20:00, surgery was scheduled for Sunday at 09:00, the delay from injury to surgery was approximately 13 hours... (1 failures)
- Generated Case 1: [Process_Auditor] 6yo male with supracondylar fracture from falling off a swing, pink pulseless hand, arrived Saturday 20:00, surgery Sunday 09:00 (13h delay), Borderline.

### signals:Missing must_find_signals: presented to the emergency department on Sunday at 15:30, surgery was performed at 18:00, the delay was due to preoperative clearance processes... (1 failures)
- Generated Case 2: [Preventability_Detective] 7-year-old female with supracondylar fracture due to skateboard accident, AIN palsy, arrived Sunday 15:30, surgery Sunday 18:00 (2.5h delay), Clear Pass.

### signals:Missing must_find_signals: brought to the emergency department on Friday at 17:00, surgery was scheduled for Saturday at 11:00, the delay was due to OR availability... (1 failures)
- Generated Case 3: [Delay_Driver_Profiler] 5yo male with supracondylar fracture from monkey bars fall, pucker sign, arrived Friday 17:00, surgery Saturday 11:00 (18h delay), Clear Fail.

### signals:Missing must_find_signals: presented to the emergency department on Saturday at 14:00, surgery was performed at 16:00, signs of compartment syndrome, including severe pain... (1 failures)
- Generated Case 4: [Exclusion_Hunter] 9yo female with supracondylar fracture from bicycle crash, compartment syndrome, arrived Saturday 14:00, surgery Saturday 16:00 (2h delay), Clear Pass.

### signals:Missing must_find_signals: brought to the emergency department on Saturday at 12:00, surgery was scheduled for 14:00, stable neurovascular status, with a warm, pink hand... (1 failures)
- Generated Case 5: [Safety_Signal] 4-year-old male with supracondylar fracture from trampoline accident, normal neurovascular status, arrived Saturday 12:00, surgery Saturday 14:00 (2h delay), Clear Pass.

### signals:Missing must_find_signals: sustained during a family outing, normal neurovascular status, surgery was scheduled and commenced at 17:00... (1 failures)
- Generated Case 46: [Exclusion_Hunter] 7yo female with supracondylar fracture from a family outing accident, normal neurovascular status, arrived Sunday 15:00, surgery Sunday 17:00 (2h delay), Clear Pass.

### signals:Missing must_find_signals: pink but pulseless, no radial or ulnar pulse, surgery at 23:00... (1 failures)
- Generated Case 47: [Safety_Signal] 6yo male with supracondylar fracture due to running into a wall, pink pulseless hand, arrived Friday 11:00, surgery Friday 23:00 (12h delay), Clear Fail.

### signals:Missing must_find_signals: swing set collapsed on her, AIN intact, mild weakness in thumb opposition... (1 failures)
- Generated Case 48: [Documentation_Gap] 8-year-old female with supracondylar fracture from collapsing swing set, AIN palsy, arrived Saturday 14:00, surgery Saturday 18:00 (4h delay), Borderline.

### signals:Missing must_find_signals: early signs of compartment syndrome, surgery was delayed until 06:00, 9-hour wait for intervention... (1 failures)
- Generated Case 49: [Process_Auditor] 5yo male with supracondylar fracture from an in-home fall, compartment syndrome, arrived Sunday 21:00, surgery Monday 06:00 (9h delay), Clear Fail.


## Next Actions
- Tighten signal extraction prompt to address: Extracted signal count 2 < min 3.
