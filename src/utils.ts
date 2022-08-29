/**
 * @file Contains utility functions and classes used in the application.
 */
import {getInput, setFailed} from '@actions/core'
import {getOctokit} from '@actions/github'
import dotenv from 'dotenv'

dotenv.config()

const GITHUB_TOKEN = getInput('github_token')

// Create octokit client
if (!GITHUB_TOKEN) setFailed('Github token is missing.')
export const octokit = getOctokit(GITHUB_TOKEN)
