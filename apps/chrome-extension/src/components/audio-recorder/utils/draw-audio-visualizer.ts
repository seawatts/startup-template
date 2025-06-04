interface VisualizerState {
  barData: number[];
  lastBarUpdateTime: number;
  hasReceivedData: boolean[]; // Track which bars have received data
}

export function createAudioVisualizer() {
  const state: VisualizerState = {
    barData: [],
    hasReceivedData: [],
    lastBarUpdateTime: 0,
  };

  return function draw({
    canvas,
    analyser,
  }: {
    canvas: HTMLCanvasElement;
    analyser: AnalyserNode;
  }) {
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;

    const barWidth = 3;
    const barSpacing = 1;
    const totalBars = Math.floor(canvas.width / (barWidth + barSpacing));

    // Initialize arrays if needed
    if (state.barData.length !== totalBars) {
      state.barData = new Array(totalBars).fill(0);
      state.hasReceivedData = new Array(totalBars).fill(false);
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Get current audio data
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    const centerY = canvas.height / 2;
    const cornerRadius = 1.5;

    // Create gradient
    const gradient = canvasContext.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.03, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.97, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    const currentTime = performance.now();
    if (currentTime - state.lastBarUpdateTime >= 75) {
      // 75ms interval
      const average = [...dataArray].reduce((a, b) => a + b) / bufferLength;
      const newValue = average / 2;

      // Shift data and update received data flags
      state.hasReceivedData = [...state.hasReceivedData.slice(1), newValue > 0];
      state.barData = [...state.barData.slice(1), newValue];
      state.lastBarUpdateTime = currentTime;
    }

    // Interpolate bar heights for smooth transition
    const interpolatedBars = state.barData.map((barHeight, index) => {
      const previousHeight = index > 0 ? (state.barData[index - 1] ?? 0) : 0;
      return previousHeight + (barHeight - previousHeight) * 0.075;
    });

    // Draw bars
    for (const [index, barHeight] of interpolatedBars.entries()) {
      const minHeight = 2;
      const height = Math.max(barHeight / 2, minHeight);
      const x = index * (barWidth + barSpacing);
      const y = centerY - height;

      // Use gradient only for bars that have received data
      canvasContext.fillStyle = state.hasReceivedData[index]
        ? gradient
        : '#d3d3d3';

      // Draw rounded rectangle
      canvasContext.beginPath();
      canvasContext.moveTo(x + cornerRadius, y);
      canvasContext.lineTo(x + barWidth - cornerRadius, y);
      canvasContext.arcTo(
        x + barWidth,
        y,
        x + barWidth,
        y + cornerRadius,
        cornerRadius,
      );
      canvasContext.lineTo(x + barWidth, y + height * 2 - cornerRadius);
      canvasContext.arcTo(
        x + barWidth,
        y + height * 2,
        x + barWidth - cornerRadius,
        y + height * 2,
        cornerRadius,
      );
      canvasContext.lineTo(x + cornerRadius, y + height * 2);
      canvasContext.arcTo(
        x,
        y + height * 2,
        x,
        y + height * 2 - cornerRadius,
        cornerRadius,
      );
      canvasContext.lineTo(x, y + cornerRadius);
      canvasContext.arcTo(x, y, x + cornerRadius, y, cornerRadius);
      canvasContext.fill();
    }
  };
}
