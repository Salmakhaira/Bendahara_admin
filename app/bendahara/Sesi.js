'use client'
import { createContext, useContext } from 'react'

export const SesiContext = createContext({ email: '' })
export const useSesi = () => useContext(SesiContext)
