async function openCamera(preStream = null, videoTrack = null) {
    if (preStream != null) {

        if (videoTrack && videoTrack.readyState && videoTrack.readyState === 'ended') {
            // Request a new video stream
            const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });

            // Remove the old video track
            preStream.removeTrack(this.stream.getVideoTracks()[0]);

            // Add the new video track
            preStream.addTrack(newVideoStream.getVideoTracks()[0]);

            return newVideoStream;
        }
    }
    else {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream;
    }


}

async function openMicrophone(preStream = null, audioTrack = null) {
    // Open microphone
    if (preStream != null) {
        if (audioTrack && audioTrack.readyState && audioTrack.readyState === 'ended') {
            // Request a new audio stream
            const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Remove the old audio track
            preStream.removeTrack(this.stream.getAudioTracks()[0]);

            // Add the new audio track
            preStream.addTrack(newAudioStream.getAudioTracks()[0]);

            return newAudioStream;
        }
    }
    else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
    }
}

async function openVedio(preStream = null, videoTrack = null) {
    if (preStream != null) {

        if (videoTrack && videoTrack.readyState && videoTrack.readyState === 'ended') {
            // Request a new video stream
            const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });

            // Remove the old video track
            preStream.removeTrack(this.stream.getVideoTracks()[0]);

            // Add the new video track    
            preStream.addTrack(newVideoStream.getVideoTracks()[0]);

            return newVideoStream;

        }
    }
    else {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream;
    }
}

function stopCamera(stream) {
    // Stop camera
    stream.getTracks().forEach(track => track.stop());
}
function stopMicrophone(stream) {
    // Stop microphone
    stream.getTracks().forEach(track => track.stop());
}