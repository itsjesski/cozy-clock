#!/usr/bin/env node

/**
 * Interactive Release Script
 * Auto-generates release notes from git commits and updates CHANGELOG.md
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function getCommitsSinceTag(tag) {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD'
    const log = execSync(
      `git log ${range} --pretty=format:"%s|||%b|||%h" --no-merges`,
      { encoding: 'utf8' },
    ).trim()

    if (!log) return []

    return log.split('\n').map((line) => {
      const [subject, body, hash] = line.split('|||')
      return { subject, body, hash }
    })
  } catch (error) {
    console.error('Error getting commits:', error.message)
    return []
  }
}

function categorizeCommits(commits) {
  const categories = {
    Added: [],
    Changed: [],
    Fixed: [],
    Security: [],
    Documentation: [],
    Other: [],
  }

  const stats = {
    conventional: 0,
    nonConventional: 0,
    ignored: 0,
    nonConventionalCommits: [],
  }

  const typeMapping = {
    feat: 'Added',
    feature: 'Added',
    add: 'Added',
    fix: 'Fixed',
    bugfix: 'Fixed',
    security: 'Security',
    sec: 'Security',
    refactor: 'Changed',
    perf: 'Changed',
    improve: 'Changed',
    update: 'Changed',
    change: 'Changed',
    docs: 'Documentation',
    chore: 'Documentation',
    style: null,
    test: null,
    build: null,
    ci: null,
  }

  for (const commit of commits) {
    const subject = commit.subject.trim()
    const match = subject.match(/^(\w+)(?:\([^)]+\))?\s*:\s*(.+)$/)

    if (match) {
      const [, type, description] = match
      const category = typeMapping[type.toLowerCase()]

      if (category) {
        const cleaned = description.charAt(0).toUpperCase() + description.slice(1)
        categories[category].push(cleaned)
        stats.conventional++
      } else if (category === null) {
        stats.ignored++
      } else {
        categories.Other.push(subject)
        stats.nonConventional++
        stats.nonConventionalCommits.push({ hash: commit.hash, message: subject })
      }
    } else {
      const lower = subject.toLowerCase()
      let categorized = false

      if (lower.startsWith('add') || lower.includes('new feature')) {
        categories.Added.push(subject)
        categorized = true
      } else if (lower.startsWith('fix') || lower.includes('bug')) {
        categories.Fixed.push(subject)
        categorized = true
      } else if (lower.includes('security') || lower.includes('vulnerab')) {
        categories.Security.push(subject)
        categorized = true
      } else if (!lower.match(/^(docs|chore|style|test|build|ci):/)) {
        categories.Other.push(subject)
        categorized = true
      }

      if (categorized) {
        stats.nonConventional++
        stats.nonConventionalCommits.push({ hash: commit.hash, message: subject })
      } else {
        stats.ignored++
      }
    }
  }

  if (categories.Other.length > 0) {
    categories.Changed.push(...categories.Other)
    delete categories.Other
  } else {
    delete categories.Other
  }

  return { categories, stats }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  return packageJson.version
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number)
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
  }
}

function getTodayDate() {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function getRepoCommitHistoryUrl() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
    const normalized = remoteUrl
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '')

    if (normalized.startsWith('https://github.com/')) {
      return `${normalized}/commits/main`
    }
  } catch {
    // ignore and fall back below
  }

  return null
}

function formatChangelog(categories) {
  let output = ''
  const orderedCategories = ['Added', 'Changed', 'Fixed', 'Security', 'Documentation']

  for (const category of orderedCategories) {
    if (categories[category] && categories[category].length > 0) {
      output += `### ${category}\n`
      for (const item of categories[category]) {
        output += `- ${item}\n`
      }
      output += '\n'
    }
  }

  return output
}

async function main() {
  try {
    console.log('🚀 Cozy Clock Release Script\n')

    const latestTag = getLatestTag()
    const commits = getCommitsSinceTag(latestTag)

    if (commits.length === 0) {
      console.log('⚠️  No commits found since last release.')
      console.log('Make some changes and commit them before creating a release.')
      process.exit(0)
    }

    console.log(
      `📦 Found ${commits.length} commit${commits.length !== 1 ? 's' : ''} since ${latestTag || 'beginning'}\n`,
    )

    let releaseType = process.argv[2]

    if (!releaseType) {
      releaseType = await question('Release type (patch/minor/major): ')
    }

    releaseType = releaseType.toLowerCase().trim()
    if (!['patch', 'minor', 'major'].includes(releaseType)) {
      console.error('Invalid release type. Must be patch, minor, or major.')
      process.exit(1)
    }

    const currentVersion = getCurrentVersion()
    const newVersion = bumpVersion(currentVersion, releaseType)
    const today = getTodayDate()
    const repoCommitHistoryUrl = getRepoCommitHistoryUrl()

    console.log(`\nCurrent version: ${currentVersion}`)
    console.log(`New version: ${newVersion}\n`)

    console.log('🤖 Analyzing commits and generating changelog...\n')
    const { categories, stats } = categorizeCommits(commits)

    console.log('📊 Commit Analysis:')
    console.log(`   ✓ ${stats.conventional} conventional commit${stats.conventional !== 1 ? 's' : ''}`)
    console.log(`   ⊘ ${stats.ignored} ignored (docs/chore/etc)`)

    if (stats.nonConventional > 0) {
      console.log(`   ⚠ ${stats.nonConventional} non-conventional commit${stats.nonConventional !== 1 ? 's' : ''}`)
      console.log('\n⚠️  Warning: Some commits do not use conventional format:')
      stats.nonConventionalCommits.forEach((commit) => {
        console.log(`   ${commit.hash} - ${commit.message}`)
      })
      console.log('\n💡 Tip: Use format like "feat: description" for better changelogs')
      console.log('   See CONTRIBUTING.md for guidelines\n')
    } else {
      console.log('   🎉 All commits follow conventional format!\n')
    }

    let changelogEntry = `## [${newVersion}] - ${today}\n\n`
    changelogEntry += formatChangelog(categories)
    if (repoCommitHistoryUrl) {
      changelogEntry += `---\n\n[Full commit history](${repoCommitHistoryUrl})\n\n`
    }

    console.log('📝 Auto-generated Changelog:\n')
    console.log(changelogEntry)

    const shouldEdit = await question('Edit changelog before proceeding? (yes/no): ')

    if (shouldEdit.toLowerCase() === 'yes') {
      console.log('\nYou can manually edit the changes for each category.')
      console.log('Press Enter without typing to keep auto-generated items.\n')

      const finalCategories = {}
      for (const [category, items] of Object.entries(categories)) {
        if (items.length === 0) continue

        console.log(`\n${category} (currently ${items.length} item${items.length !== 1 ? 's' : ''}):`)
        items.forEach((item, index) => console.log(`  ${index + 1}. ${item}`))

        const response = await question('Keep these items? (yes/edit/skip): ')

        if (response.toLowerCase() === 'skip') {
          continue
        } else if (response.toLowerCase() === 'edit') {
          console.log('Enter new items (empty line to finish):')
          const newItems = []
          while (true) {
            const line = await question('  - ')
            if (!line.trim()) break
            newItems.push(line.trim())
          }
          if (newItems.length > 0) {
            finalCategories[category] = newItems
          }
        } else {
          finalCategories[category] = items
        }
      }

      changelogEntry = `## [${newVersion}] - ${today}\n\n`
      changelogEntry += formatChangelog(finalCategories)
      if (repoCommitHistoryUrl) {
        changelogEntry += `---\n\n[Full commit history](${repoCommitHistoryUrl})\n\n`
      }

      console.log('\n📝 Final Changelog:\n')
      console.log(changelogEntry)
    }

    const confirm = await question('\nProceed with release? (yes/no): ')
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Release cancelled.')
      process.exit(0)
    }

    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md')
    let changelog = fs.readFileSync(changelogPath, 'utf8')

    const headerEnd = changelog.indexOf('\n## ')
    if (headerEnd === -1) {
      const insertPoint = changelog.indexOf('\n\n') + 2
      changelog = changelog.slice(0, insertPoint) + changelogEntry + changelog.slice(insertPoint)
    } else {
      changelog = changelog.slice(0, headerEnd + 1) + changelogEntry + changelog.slice(headerEnd + 1)
    }

    fs.writeFileSync(changelogPath, changelog)
    console.log('\n✓ Updated CHANGELOG.md')

    console.log('\n📦 Creating release...\n')

    try {
      execSync('git add CHANGELOG.md', { stdio: 'inherit' })
      execSync(`git commit -m "docs: update changelog for v${newVersion}"`, { stdio: 'inherit' })
      console.log('✓ Committed changelog')

      execSync(`npm version ${releaseType} --no-git-tag-version`, { stdio: 'inherit' })
      execSync('git add package.json package-lock.json', { stdio: 'inherit' })
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' })
      console.log(`✓ Bumped version to ${newVersion}`)

      execSync(`git tag v${newVersion}`, { stdio: 'inherit' })
      console.log(`✓ Created tag v${newVersion}`)

      execSync('git push', { stdio: 'inherit' })
      execSync('git push --tags', { stdio: 'inherit' })
      console.log('✓ Pushed to remote')

      console.log(`\n🎉 Release v${newVersion} complete!\n`)
      console.log('✅ GitHub Actions will automatically:')
      console.log('   - Build the Windows installer')
      console.log('   - Create a GitHub release')
      console.log('   - Attach the installer')
      console.log('   - Generate release notes\n')
      console.log('📝 Changelog has been updated: CHANGELOG.md\n')
    } catch (error) {
      console.error('\n❌ Git operation failed:', error.message)
      console.log('\nYou may need to manually revert changes.')
      process.exit(1)
    }

    rl.close()
  } catch (error) {
    console.error('Error:', error.message)
    rl.close()
    process.exit(1)
  }
}

main()
