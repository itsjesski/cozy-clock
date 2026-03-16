#!/usr/bin/env node

/**
 * Release script - bumps version, updates changelog, and creates git tag
 * Usage: npm run release
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const packagePath = path.join(__dirname, '../package.json')
const changelogPath = path.join(__dirname, '../CHANGELOG.md')

// Read current package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
const currentVersion = pkg.version

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number)
const newPatch = patch + 1
const newVersion = `${major}.${minor}.${newPatch}`

console.log(`Bumping version from ${currentVersion} to ${newVersion}`)

// Update package.json
pkg.version = newVersion
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')

// Get git log since last tag
let changelog = ''
try {
  const lastTag = execSync('git describe --tags --abbrev=0', {
    encoding: 'utf-8',
  }).trim()
  changelog = execSync(`git log ${lastTag}..HEAD --oneline`, {
    encoding: 'utf-8',
  })
} catch {
  changelog = execSync('git log --oneline -10', { encoding: 'utf-8' })
}

// Parse commits and format changelog
const commits = changelog
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^\w+ (.*)$/)
    return match ? match[1] : line
  })

const formattedLogEntry = `

## [${newVersion}] - ${new Date().toISOString().split('T')[0]}

### Changes
${commits.map((c) => `- ${c}`).join('\n')}
`

// Read existing changelog
let existingChangelog = ''
if (fs.existsSync(changelogPath)) {
  existingChangelog = fs.readFileSync(changelogPath, 'utf-8')
}

// Write updated changelog
fs.writeFileSync(
  changelogPath,
  `# Changelog

All notable changes to this project will be documented in this file.
${formattedLogEntry}
${existingChangelog}`,
)

console.log('Updated CHANGELOG.md')

// Stage and commit
execSync('git add package.json CHANGELOG.md')
execSync(`git commit -m "chore: bump version to ${newVersion}"`)

console.log(`Created commit for version ${newVersion}`)

// Create tag
const tagName = `v${newVersion}`
execSync(`git tag ${tagName}`)
console.log(`Created git tag ${tagName}`)

// Push
execSync('git push --tags')
console.log('Pushed tags to remote')

console.log(`✅ Release ${newVersion} complete!`)
