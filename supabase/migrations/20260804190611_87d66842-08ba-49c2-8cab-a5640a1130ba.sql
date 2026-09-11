UPDATE plan_items SET data = jsonb_set(data, '{owner}', to_jsonb(v.owner))
FROM (VALUES
 ('M0','Management Board + Legal, Compliance'),
 ('M1','Legal, Compliance; Risk (+ external accounting)'),
 ('M2','Management Board + Legal, Compliance'),
 ('M3','Legal, Compliance, Risk; IT/InfoSec lead'),
 ('M4','Candidates'),
 ('M5','Legal, Compliance, Risk'),
 ('M6','Management Board + Legal, Compliance'),
 ('M7','Management Board + Legal, Compliance')
) AS v(code, owner)
WHERE plan_items.plan_key='grg-mica' AND plan_items.section='milestone' AND plan_items.data->>'code' = v.code;