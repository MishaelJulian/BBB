'use client'

import * as React from 'react'
import { ShelfBay, type ShelfBayProps } from './ShelfBay'

export interface Shelf3DProps extends ShelfBayProps {}

export function Shelf3D(props: Shelf3DProps) {
  return <ShelfBay {...props} />
}
