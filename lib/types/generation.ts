/**
 * Generation Types - Two-Stage Content Generation System
 *
 * Stage 1: User requirements + documents → Scene Outlines (per-page)
 * Stage 2: Scene Outlines → Full Scenes (slide/quiz/interactive/pbl with actions)
 */

import type { ActionType } from './action';
import type { MediaGenerationRequest } from '@/lib/media/types';

// ==================== PDF Image Types ====================

/**
 * Image extracted from PDF with metadata
 */
export interface PdfImage {
  id: string; // e.g., "img_1", "img_2"
  src: string; // base64 data URL (empty when stored in IndexedDB)
  pageNumber: number; // Page number in PDF
  description?: string; // Optional description for AI context
  storageId?: string; // Reference to IndexedDB (session_xxx_img_1)
  width?: number; // Image width (px or normalized)
  height?: number; // Image height (px or normalized)
}

/**
 * Image mapping for post-processing: image_id → base64 URL
 */
export type ImageMapping = Record<string, string>;

// ==================== Stage 1 Input ====================

export interface UploadedDocument {
  id: string;
  name: string; // Original filename
  type: 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'image' | 'other';
  size: number; // Bytes
  uploadedAt: Date;
  contentSummary?: string; // Placeholder for parsing
  extractedTopics?: string[]; // Placeholder for parsing
  pageCount?: number;
  storageRef?: string;
}

/**
 * Simplified user requirements for course generation
 * All details (topic, duration, style, etc.) should be included in the requirement text
 */
export interface UserRequirements {
  requirement: string; // Single free-form text for all user input
  userNickname?: string; // Student nickname for personalization
  userBio?: string; // Student background for personalization
  webSearch?: boolean; // Enable web search for richer context
  // How deeply to cover the topic. Drives the depth-tier distribution in outline generation.
  // Defaults to 'standard'.
  depthProfile?: DepthProfile;
  // Audience prior knowledge level. Influences foundation density and terminology pacing.
  // Defaults to 'intermediate'.
  audienceLevel?: AudienceLevel;
}

// ==================== Depth & Coverage Model ====================

/** Per-scene cognitive depth tier (loosely mapped to Bloom's taxonomy). */
export type DepthLevel =
  | 'foundation' // Remember/Understand: definitions, motivation, simple examples
  | 'building' // Understand/Apply: walkthroughs, mechanisms, worked examples
  | 'application' // Apply/Analyze: non-trivial problems, comparisons, edge cases
  | 'synthesis' // Analyze/Evaluate: integrate multiple concepts, design tradeoffs
  | 'mastery'; // Evaluate/Create: novel scenarios, research-level depth

/** Course-wide depth profile selected by the user (or inferred). */
export type DepthProfile = 'overview' | 'standard' | 'deep-dive' | 'mastery';

/** Audience prior knowledge. */
export type AudienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** Optional fine-grained Bloom tier for downstream eval / analytics. */
export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

/** A topic the model planned to cover and which scenes address it. */
export interface CoverageTopic {
  name: string;
  rationale: string; // Why this sub-topic matters for the course goal
  addressedBySceneIds: string[]; // Must be non-empty in a complete outline
}

/** Top-level coverage map returned alongside outlines. */
export interface CoverageMap {
  topics: CoverageTopic[];
}

/** Outline generation result envelope. */
export interface OutlineGenerationOutput {
  languageDirective: string;
  outlines: SceneOutline[];
  coverageMap: CoverageMap;
  depthProfile: DepthProfile;
}

// ==================== Stage 1 Output: Scene Outlines (Simplified) ====================

/**
 * Simplified scene outline
 * Gives AI more freedom, only requiring intent description and key points
 */
export interface SceneOutline {
  id: string;
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  description: string; // 1-2 sentences describing the purpose
  keyPoints: string[]; // 3-5 core key points
  teachingObjective?: string;
  estimatedDuration?: number; // seconds
  order: number;
  languageNote?: string; // LLM-inferred language note for this scene
  // Cognitive depth tier. Optional in the type for backwards compatibility,
  // but the outline generator fills it in (defaulting to 'building') so downstream
  // code can rely on it being present after generateSceneOutlinesFromRequirements.
  depthLevel?: DepthLevel;
  // Scene IDs whose concepts this scene depends on. Required for application/synthesis/mastery.
  // All entries must reference scenes with strictly smaller `order`.
  prerequisiteSceneIds?: string[];
  // Optional fine-grained Bloom tier when the model wants to be specific.
  bloomLevel?: BloomLevel;
  // Suggested image IDs (from PDF-extracted images)
  suggestedImageIds?: string[]; // e.g., ["img_1", "img_3"]
  // AI-generated media requests (when PDF images are insufficient)
  mediaGenerations?: MediaGenerationRequest[]; // e.g., [{ type: 'image', prompt: '...', elementId: 'gen_img_1' }]
  // Quiz-specific config
  quizConfig?: {
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    questionTypes: ('single' | 'multiple' | 'text')[];
  };
  // Interactive-specific config
  interactiveConfig?: {
    conceptName: string;
    conceptOverview: string;
    designIdea: string;
    subject?: string;
  };
  // PBL-specific config
  pblConfig?: {
    projectTopic: string;
    projectDescription: string;
    targetSkills: string[];
    issueCount?: number;
  };
}

// ==================== Stage 3 Output: Generated Content ====================

import type { PPTElement, SlideBackground } from './slides';
import type { QuizQuestion } from './stage';

/**
 * AI-generated slide content
 */
export interface GeneratedSlideContent {
  elements: PPTElement[];
  background?: SlideBackground;
  remark?: string;
}

/**
 * AI-generated quiz content
 */
export interface GeneratedQuizContent {
  questions: QuizQuestion[];
}

// ==================== PBL Generation Types ====================

import type { PBLProjectConfig } from '@/lib/pbl/types';

/**
 * AI-generated PBL content
 */
export interface GeneratedPBLContent {
  projectConfig: PBLProjectConfig;
}

// ==================== Interactive Generation Types ====================

/**
 * Scientific model output from scientific modeling stage
 */
export interface ScientificModel {
  core_formulas: string[];
  mechanism: string[];
  constraints: string[];
  forbidden_errors: string[];
}

/**
 * AI-generated interactive content
 */
export interface GeneratedInteractiveContent {
  html: string;
  scientificModel?: ScientificModel;
}

// ==================== Legacy Types (for compatibility) ====================

export interface SuggestedSlideElement {
  type: 'text' | 'image' | 'shape' | 'chart' | 'latex' | 'line';
  purpose: 'title' | 'subtitle' | 'content' | 'example' | 'diagram' | 'formula' | 'highlight';
  contentHint: string;
  position?: 'top' | 'center' | 'bottom' | 'left' | 'right';
  chartType?: 'bar' | 'line' | 'pie' | 'radar';
  textOutline?: string[];
}

export interface SuggestedQuizQuestion {
  type: 'single' | 'multiple' | 'short_answer';
  questionOutline: string;
  suggestedOptions?: string[];
  targetConceptId?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SuggestedAction {
  type: ActionType;
  description: string;
  timing?: 'start' | 'middle' | 'end' | 'after-content';
}

// ==================== Generation Session ====================

export interface GenerationProgress {
  currentStage: 1 | 2 | 3;
  overallProgress: number; // 0-100
  stageProgress: number; // 0-100
  statusMessage: string;
  scenesGenerated: number;
  totalScenes: number;
  errors?: string[];
}

export interface GenerationSession {
  id: string;
  requirements: UserRequirements;
  sceneOutlines?: SceneOutline[];
  progress: GenerationProgress;
  startedAt: Date;
  completedAt?: Date;
  generatedStageId?: string;
}
