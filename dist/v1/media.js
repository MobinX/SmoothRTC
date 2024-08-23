"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openCamera = openCamera;
exports.openMicrophone = openMicrophone;
exports.openVedio = openVedio;
exports.stopCamera = stopCamera;
exports.stopMicrophone = stopMicrophone;
function openCamera() {
    return __awaiter(this, arguments, void 0, function* (preStream = null) {
        if (preStream != null) {
            if (videoTrack && videoTrack.readyState && videoTrack.readyState === 'ended') {
                // Request a new video stream
                const newVideoStream = yield navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                // Remove the old video track
                preStream.removeTrack(preStream.getVideoTracks()[0]);
                // Add the new video track
                preStream.addTrack(newVideoStream.getVideoTracks()[0]);
                return newVideoStream;
            }
        }
        else {
            const stream = yield navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            return stream;
        }
    });
}
function openMicrophone() {
    return __awaiter(this, arguments, void 0, function* (preStream = null, audioTrack = null) {
        // Open microphone
        if (preStream != null) {
            if (audioTrack && audioTrack.readyState && audioTrack.readyState === 'ended') { }
            // Request a new audio stream
            const newAudioStream = yield navigator.mediaDevices.getUserMedia({ audio: true });
            // Remove the old audio track
            preStream.removeTrack(preStream.getAudioTracks()[0]);
            // Add the new audio track
            preStream.addTrack(newAudioStream.getAudioTracks()[0]);
            return newAudioStream;
        }
        else {
            const stream = yield navigator.mediaDevices.getUserMedia({ audio: true });
            return stream;
        }
    });
}
function openVedio() {
    return __awaiter(this, arguments, void 0, function* (preStream = null) {
        if (preStream != null) {
            let videoTrack = preStream.getVideoTracks()[0];
            if (videoTrack && videoTrack.readyState && videoTrack.readyState === 'ended') {
                // Request a new video stream
                const newVideoStream = yield navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                // Remove the old video track
                preStream.removeTrack(preStream.getVideoTracks()[0]);
                // Add the new video track    
                preStream.addTrack(newVideoStream.getVideoTracks()[0]);
                return newVideoStream;
            }
        }
        else {
            const stream = yield navigator.mediaDevices.getUserMedia({ video: true });
            return stream;
        }
    });
}
function stopCamera(stream) {
    // Stop camera
    console.log('camera stopped');
    stream.getTracks().forEach(track => track.stop());
}
function stopMicrophone(stream) {
    // Stop microphone
    stream.getTracks().forEach(track => track.stop());
}
