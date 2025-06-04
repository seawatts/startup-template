import { memo } from 'react';

import { Camera } from '../../camera';

export const MemoizedCamera = memo(Camera, (previous, next) => {
  return previous.showCamera === next.showCamera;
});
