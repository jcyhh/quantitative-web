import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { i18n, languageStorageKey } from '../../i18n'
import { storage } from '../../lib/storage'
import { LanguageSwitcher } from './LanguageSwitcher'

const originalLanguage = i18n.resolvedLanguage ?? i18n.language

beforeEach(async () => {
    storage.remove(languageStorageKey)
    await i18n.changeLanguage('zh-CN')
})

afterEach(async () => {
    storage.remove(languageStorageKey)
    await i18n.changeLanguage(originalLanguage)
})

test('selecting another language updates the controlled value and persisted preference', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    const languageSelect = screen.getByRole('combobox')
    expect(languageSelect).toHaveValue('zh-CN')
    expect(screen.getByRole('option', { name: '简体中文' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()

    await user.selectOptions(languageSelect, 'en-US')

    await waitFor(() => {
        expect(languageSelect).toHaveValue('en-US')
    })
    expect(storage.get(languageStorageKey)).toBe('en-US')
})
