-- Migration: Update Level 0 Sheet A with solution video URLs
-- Description: Add Google Drive solution video links for problems A-Z (excluding W)
-- Date: 2026-02-10

-- Update each problem with its solution video URL
UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1VdXPaEKt1AmcZks2GQxmXkOOEmQ8-DUZ/view'
WHERE problem_letter = 'A' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/12EeTho38V0UPze1pvCB4NpWPEf0dthJk/view'
WHERE problem_letter = 'B' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1Gs4H0FMgh6RMEV8p1MCxgRW98gq7hM1q/view'
WHERE problem_letter = 'C' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/16u_b5uX9ZnGvVYkvb1K3yYjyTi3xGmoF/view'
WHERE problem_letter = 'D' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/15kIsIx_GgDOEc4RtZg85Sh5gBe6R9lFM/view'
WHERE problem_letter = 'E' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1M3j9Qg_YZc_m26CeTMQGrkbImPwext_4/view'
WHERE problem_letter = 'F' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1uz2Ztl5pNUtpQTbxbcLti34u4amapfp2/view'
WHERE problem_letter = 'G' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1GbKALQUC6l3uDWC0APJTqFQiORYQb8de/view'
WHERE problem_letter = 'H' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1W3fp_9NEZ5o-puJEQ99tJPX33ZDNBi5t/view'
WHERE problem_letter = 'I' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1vSiWO--ZhBUVhG-rjTMurydG2cxHja4T/view'
WHERE problem_letter = 'J' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1t8mfdraZHpYnmEpyvQy1u8re8OFSMYgN/view'
WHERE problem_letter = 'K' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/19kB-tUK8l8k8l5TQJgD371cRUHN_uRH_/view'
WHERE problem_letter = 'L' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/19AMfrLn6bLCqJokGY4Cf4HkAcUUzzhDW/view'
WHERE problem_letter = 'M' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1Ia2bzBB9jeX1YpvvGlXDZ-wCSOMZ4nfe/view'
WHERE problem_letter = 'N' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1GDRpwkuNHVJk1IaC3av-XNpjCGfMS2Y4/view'
WHERE problem_letter = 'O' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1Bu0ccRCL6yldRnJnT2zNIa-Uj28Yjup_/view'
WHERE problem_letter = 'P' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1mD3J7g4eAbWo_6DH-vGN8Ucor3p_0DrC/view'
WHERE problem_letter = 'Q' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1ZtTxj8So1QEgBmeJeerkx_5HVAT6gjdK/view'
WHERE problem_letter = 'R' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1BnhbHZATm2Ydmf-_aDJfwzwGmIi-xBfs/view'
WHERE problem_letter = 'S' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1ezb7vg0Y15pPP0uvJlw1aLbtUep-JS3c/view'
WHERE problem_letter = 'T' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1CZvF05-L_b2c97mxjtUyA0YjCFZyTu_u/view'
WHERE problem_letter = 'U' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1L1mqYPKUzk_dPmG89Wxc3b_2qd0GXDGi/view'
WHERE problem_letter = 'V' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

-- Note: Problem W does not have a solution video

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1icE2bzZy7prRSKfiGBi2bKmmlK8ySOaX/view'
WHERE problem_letter = 'X' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1i642_jX-zBf-3ZJnOLc0Rr4II14TLRld/view'
WHERE problem_letter = 'Y' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));

UPDATE public.curriculum_problems 
SET solution_video_url = 'https://drive.google.com/file/d/1ZGeFWfq2y1teDz-OGhvCfHphga1Yogd2/view'
WHERE problem_letter = 'Z' 
AND sheet_id = (SELECT id FROM public.curriculum_sheets WHERE slug = 'sheet-a' AND level_id = (SELECT id FROM public.curriculum_levels WHERE slug = 'level-0'));
