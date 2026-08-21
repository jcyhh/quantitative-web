import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const skillsDirectory = resolve('ai/skills')
const errors = []

function reportError(message) {
  errors.push(message)
}

function validateSkill(skillName) {
  const skillPath = resolve(skillsDirectory, skillName, 'SKILL.md')

  if (!existsSync(skillPath)) {
    reportError(`${skillName}: missing SKILL.md`)
    return
  }

  const content = readFileSync(skillPath, 'utf8')
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)

  if (frontmatter === null) {
    reportError(`${skillName}: SKILL.md must start with YAML frontmatter`)
    return
  }

  const name = frontmatter[1].match(/^name:\s*([a-z0-9-]+)\s*$/m)
  const description = frontmatter[1].match(/^description:\s*(\S[\s\S]*)$/m)

  if (name === null) reportError(`${skillName}: frontmatter requires a lowercase kebab-case name`)
  if (name !== null && name[1] !== skillName) reportError(`${skillName}: frontmatter name must match its directory name`)
  if (name !== null && name[1].length > 64) reportError(`${skillName}: name must be 64 characters or fewer`)
  if (description === null || description[1].trim().length === 0) reportError(`${skillName}: frontmatter requires a non-empty description`)
  if (content.includes('TODO') || content.includes('<placeholder>')) reportError(`${skillName}: remove unfinished placeholders before committing`)
}

if (!existsSync(skillsDirectory)) {
  reportError('Missing ai/skills directory')
} else {
  const skillDirectories = readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  if (skillDirectories.length === 0) reportError('ai/skills must contain at least one skill')
  for (const skillName of skillDirectories) validateSkill(skillName)
}

if (errors.length > 0) {
  for (const error of errors) console.error(`AI skill validation: ${error}`)
  process.exitCode = 1
}
