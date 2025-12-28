
Narrative
Emily Carter, a 14-year-old with adolescent idiopathic scoliosis, underwent a posterior spinal fusion (T4–L1) and was discharged home in stable condition. Two weeks later, her family called reporting increasing pain and low-grade fever and were advised to monitor at home. Sixteen days after discharge, Emily returned with high fever, worsening back pain, and wound drainage and required inpatient readmission for suspected surgical site infection. Because the readmission occurred within 30 days of scoliosis surgery, this case qualifies as a USNWR Orthopedics I32a event.



{
  "patient": {
    "patient_id": "PT_SCO_013",
    "dob": null,
    "age_years": 14,
    "sex": "F"
  },
  "index_context": {
    "framework": "USNWR",
    "domain": "orthopedics",
    "metric_id": "I32a",
    "metric_label": "Scoliosis surgery 30-day readmission"
  },
  "encounters": [
    {
      "encounter_id": "ENC_001_INDEX",
      "type": "INPATIENT_SURGICAL",
      "start_ts": "2025-11-18T05:52:00",
      "end_ts": "2025-11-22T13:10:00",
      "facility": "Pediatric Hospital",
      "service_primary": "Pediatric Orthopedics",
      "events": [
        {
          "event_id": "EVT_0001",
          "event_ts": "2025-11-18T07:30:00",
          "event_type": "PROCEDURE",
          "title": "Posterior spinal fusion T4-L1",
          "details": {
            "indication": "Adolescent idiopathic scoliosis",
            "laterality": null,
            "location": "OR",
            "anesthesia": "General"
          }
        },
        {
          "event_id": "EVT_0002",
          "event_ts": "2025-11-20T09:05:00",
          "event_type": "CARE_MILESTONE",
          "title": "POD2 progress",
          "details": {
            "pain": "controlled overnight",
            "temperature": "afebrile",
            "mobility": "ambulating with PT",
            "incision": "dressing clean/dry/intact; no drainage"
          }
        },
        {
          "event_id": "EVT_0003",
          "event_ts": "2025-11-22T13:10:00",
          "event_type": "DISCHARGE",
          "title": "Discharged home",
          "details": {
            "disposition": "home",
            "follow_up_plan": "Ortho clinic in 2 weeks"
          }
        }
      ],
      "notes": [
        {
          "note_id": "NOTE_0001",
          "note_ts": "2025-11-18T16:20:00",
          "note_type": "OPERATIVE_NOTE",
          "author_role": "Ortho Surgeon",
          "title": "Operative Note",
          "text": "Procedure: Posterior spinal fusion T4-L1 for AIS. Estimated blood loss 450 mL. Neuromonitoring stable throughout. No dural tear. Wound closed in layers; sterile dressing applied. Post-op plan: standard pathway, multimodal analgesia, early mobilization. No immediate complications noted."
        },
        {
          "note_id": "NOTE_0002",
          "note_ts": "2025-11-20T09:05:00",
          "note_type": "POST_OP_PROGRESS_NOTE",
          "author_role": "Ortho Resident",
          "title": "Progress Note (POD2)",
          "text": "POD2: Pain controlled overnight. Afebrile. Ambulating with PT. Dressing clean/dry/intact. No drainage. Plan: continue pathway, advance diet, bowel regimen."
        },
        {
          "note_id": "NOTE_0003",
          "note_ts": "2025-11-22T12:40:00",
          "note_type": "DISCHARGE_SUMMARY",
          "author_role": "Ortho APP",
          "title": "Discharge Summary",
          "text": "Discharge diagnosis: AIS s/p posterior spinal fusion. Condition stable. Meds: acetaminophen, ibuprofen, oxycodone PRN, stool softener. Wound care: keep dressing for 48h then dry dressing PRN. Follow-up: Ortho clinic in 2 weeks. Return precautions: fever, worsening pain, redness, drainage."
        }
      ]
    },
    {
      "encounter_id": "ENC_002_POST_DISCHARGE",
      "type": "OUTPATIENT_COMMUNICATION",
      "start_ts": "2025-12-03T10:15:00",
      "end_ts": "2025-12-03T10:25:00",
      "facility": "Pediatric Hospital",
      "service_primary": "Pediatric Orthopedics",
      "events": [
        {
          "event_id": "EVT_0101",
          "event_ts": "2025-12-03T10:15:00",
          "event_type": "PHONE_CALL",
          "title": "Family phone call re: pain/fever",
          "details": {
            "reported_symptoms": [
              "increasing back pain",
              "temps up to 100.4 at home"
            ]
          }
        }
      ],
      "notes": [
        {
          "note_id": "NOTE_0101",
          "note_ts": "2025-12-03T10:15:00",
          "note_type": "OUTPATIENT_PHONE_NOTE",
          "author_role": "Ortho Triage RN",
          "title": "Telephone Encounter",
          "text": "Mom reports increasing back pain over last 2 days and temps up to 100.4 at home. No vomiting. Unsure if incision looks different; dressing changed yesterday. Advised continue meds as prescribed and monitor temperature. Offered clinic visit; family prefers to watch today. Reviewed general return precautions."
        }
      ]
    },
    {
      "encounter_id": "ENC_003_READMISSION",
      "type": "ED_TO_INPATIENT",
      "start_ts": "2025-12-08T18:40:00",
      "end_ts": null,
      "facility": "Pediatric Hospital",
      "service_primary": "Pediatrics (co-managed with Ortho)",
      "events": [
        {
          "event_id": "EVT_0201",
          "event_ts": "2025-12-08T18:40:00",
          "event_type": "ED_ARRIVAL",
          "title": "ED arrival for fever/pain/drainage",
          "details": {
            "chief_complaint": [
              "fever",
              "worsening back pain",
              "wound drainage"
            ]
          }
        },
        {
          "event_id": "EVT_0202",
          "event_ts": "2025-12-08T21:10:00",
          "event_type": "CONSULT",
          "title": "Orthopedics consult",
          "details": {
            "reason": "post-op fever and drainage"
          }
        },
        {
          "event_id": "EVT_0203",
          "event_ts": "2025-12-09T00:30:00",
          "event_type": "ADMISSION_NOTE",
          "title": "Inpatient admission H&P",
          "details": {
            "admitting_problem": "suspected surgical site infection"
          }
        }
      ],
      "notes": [
        {
          "note_id": "NOTE_0201",
          "note_ts": "2025-12-08T19:25:00",
          "note_type": "ED_PROVIDER_NOTE",
          "author_role": "ED Physician",
          "title": "ED Provider Note",
          "text": "14F s/p PSF T4-L1 on 11/18 presents with fever 102.1 and worsening midline back pain. Family notes new drainage today. Exam: incision with mild erythema; small area of serous drainage. Vitals: febrile, tachycardic. Labs drawn; blood cultures pending. Ortho consulted. Concern for surgical site infection vs viral illness."
        },
        {
          "note_id": "NOTE_0202",
          "note_ts": "2025-12-08T21:10:00",
          "note_type": "ORTHO_CONSULT_NOTE",
          "author_role": "Ortho Fellow",
          "title": "Orthopedics Consult Note",
          "text": "Seen in ED. Family reports drainage started 2-3 days ago, increased today. Incision: small inferior separation with drainage; tenderness present. Plan: admit for IV antibiotics after cultures, obtain imaging if worsens, consider OR washout if clinical course suggests deep infection."
        },
        {
          "note_id": "NOTE_0203",
          "note_ts": "2025-12-09T00:30:00",
          "note_type": "INPATIENT_H_AND_P",
          "author_role": "Hospitalist",
          "title": "History & Physical",
          "text": "Admitted for fever and suspected SSI after scoliosis fusion. Fever began today per parent. Pain escalated over last week. Drainage described as new today, but history inconsistent. Plan: empiric antibiotics, monitor vitals, trend CRP/ESR, coordinate with Ortho for possible intervention."
        },
        {
          "note_id": "NOTE_0204",
          "note_ts": "2025-12-09T14:10:00",
          "note_type": "ID_CONSULT_NOTE",
          "author_role": "Infectious Disease",
          "title": "Infectious Disease Consult",
          "text": "Concern for post-op spinal surgical site infection. Recommend targeted antibiotic strategy once cultures result. Emphasize documentation of wound appearance and drainage volume; consider imaging for deep collection. Discussed with Ortho team."
        }
      ]
    }
  ]
}


20/80 Expectations:


Display Order
Essential Field (Left Corner)
Display Text Example
Why This Is Enough (80/20)
1
Patient
Emily Carter (14F)
Human anchor + pediatric context
2
Metric
I32a – Scoliosis 30-day readmission
Orients reviewer immediately
3
Index Surgery
Posterior spinal fusion (T4–L1)
Defines episode under review
4
Surgery Date
11/18/2025
Starts metric window
5
Discharge → Readmit
11/22 → 12/08
Core timeline in one line
6
Days Post-Discharge
16 days
Instantly answers “within 30?”
7
Readmission Reason
Fever • pain • wound drainage
80% clinical gist
8
Timeline Status
Timeline complete
Sets confidence before signals

Follow up Questions:


#
Follow-up Question (for Clinical Reviewer)
Triggering Signal(s)
Notes to Review in Detail
Why This Matters for I32a
1
Was the readmission clearly categorized as infection vs another cause (pain, GI, hardware)?
infection_risks, readmission_risks
ED Provider Note, Ortho Consult, H&P
I32a requires clear attribution of unplanned admission
2
What objective evidence of SSI was documented (exam, labs, cultures, imaging)?
infection_risks
ED Note, Ortho Consult, ID Consult
Distinguishes suspected vs confirmed infection
3
Was the onset and progression of wound drainage consistently documented?
documentation ambiguity within infection_risks
ED Note vs Ortho Consult vs H&P
Conflicting timelines affect preventability assessment
4
Were post-discharge symptoms escalated appropriately after the phone call on 12/03?
readmission_risks
Outpatient Phone Note, Discharge Summary
Identifies potential gap between discharge teaching and follow-up
5
Were discharge instructions and return precautions specific and documented?
bundle_compliance (indeterminate)
Discharge Summary
Poor discharge clarity can drive preventable readmissions
6
Was this admission associated with a return to the OR, or managed non-operatively?
outcome_risks
Ortho Progress Notes, Operative Logs
I32a tracks both unplanned admission and return to OR
7
Was this readmission documented as unplanned across services (ED, Ortho, Hospitalist)?
readmission_risks
ED Note, H&P, Admission Orders
Confirms metric inclusion and avoids misclassification


