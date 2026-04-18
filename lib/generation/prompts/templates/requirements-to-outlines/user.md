Please generate scene outlines based on the following course requirements.

---

## User Requirements

{{requirement}}

---

{{userProfile}}

## Language Context

Infer the course language directive by applying the decision rules from the system prompt. Key reminders:
- Requirement language = teaching language (unless overridden by explicit request or learner context)
- Foreign language learning → teach in user's native language, not the target language
- PDF language does NOT override teaching language — translate/explain document content instead

---

## Reference Materials

### PDF Content Summary

{{pdfContent}}

### Available Images

{{availableImages}}

### Web Search Results

{{researchContext}}

{{teacherContext}}

---

## Course Depth Configuration

**Depth profile:** {{depthProfileGuidance}}

**Audience level:** {{audienceGuidance}}

Honor these settings strictly. A `deep-dive` or `mastery` profile must produce a course that is **noticeably deeper** than `standard` — more application/synthesis scenes, denser key points per scene, and explicit prerequisite chains. Do not collapse to a generic survey.

---

## Output Requirements

Please automatically infer the following from user requirements:

- Course topic and core content
- Course duration (default 15-30 minutes for `standard`; longer for `deep-dive`/`mastery`)
- Teaching style (formal/casual/interactive/academic)
- Visual style (minimal/colorful/professional/playful)

The audience level and depth profile are already specified above — do NOT re-infer them.

Then output a JSON object with `languageDirective`, `depthProfile`, `coverageMap`, and `outlines`:

```json
{
  "languageDirective": "2-5 sentence instruction describing the course language behavior",
  "depthProfile": "{{depthProfile}}",
  "coverageMap": {
    "topics": [
      { "name": "Sub-topic", "rationale": "Why it matters", "addressedBySceneIds": ["scene_1"] }
    ]
  },
  "outlines": [
    {
      "id": "scene_1",
      "type": "slide" or "quiz" or "interactive",
      "title": "Scene Title",
      "description": "Teaching purpose description",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "depthLevel": "foundation",
      "order": 1
    }
  ]
}
```

`coverageMap` MUST list every sub-topic of the requested course; every scene MUST declare `depthLevel`; scenes at `application`/`synthesis`/`mastery` MUST declare `prerequisiteSceneIds` referencing earlier scenes.

### Special Notes

1. **quiz scenes must include quizConfig**:
   ```json
   "quizConfig": {
     "questionCount": 2,
     "difficulty": "easy" | "medium" | "hard",
     "questionTypes": ["single", "multiple"]
   }
   ```
2. **If images are available**, add `suggestedImageIds` to relevant slide scenes
3. **Interactive scenes**: If a concept benefits from hands-on simulation/visualization, use `"type": "interactive"` with an `interactiveConfig` object containing `conceptName`, `conceptOverview`, `designIdea`, and `subject`. Limit to 1-2 per course.
4. **Scene count**: Standard courses ~1-2 scenes/min; deep-dive/mastery courses 1.5-3× more scenes to give application/synthesis tiers room. Don't truncate the curriculum to hit a duration target.
5. **Quiz placement**: Recommend inserting a quiz every 3-5 slides for assessment
6. **Language**: Infer from the user's requirement text and context, then output all content in the inferred language
7. **If no suitable PDF images exist** for a slide scene that would benefit from visuals, add `mediaGenerations` array with image generation prompts. Write prompts in English. Use `elementId` format like "gen_img_1", "gen_img_2" — IDs must be **globally unique across all scenes** (do NOT restart numbering per scene). To reuse a generated image in a different scene, reference the same elementId without re-declaring it in mediaGenerations. Each generated image should be visually distinct — avoid near-identical media across slides.
8. **If web search results are provided**, reference specific findings and sources in scene descriptions and keyPoints. The search results provide up-to-date information — incorporate it to make the course content current and accurate.

{{mediaGenerationPolicy}}

Please output a JSON object with `languageDirective` (string) and `outlines` (array) directly without additional explanatory text.
