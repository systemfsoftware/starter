import { describe, expect, it } from 'vitest'
import { hello } from '../src/index.js'

describe('starter', () => {
  it('Should_greet', () => {
    expect(hello('world')).toBe('hello world')
  })
})
