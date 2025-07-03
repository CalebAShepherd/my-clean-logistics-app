#!/usr/bin/env python3
"""
Simple Flask service to analyze warehouse floor plan images.
Accepts JSON POST with base64Image, width, height
Returns JSON with edges, contours (regions), regions classification, and dimensions
"""
from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import sys

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    base64Image = data.get('base64Image')
    width = data.get('width')
    height = data.get('height')
    if not base64Image or not width or not height:
        return jsonify(error='Missing required parameters'), 400
    try:
        # Decode base64 image
        img_data = base64.b64decode(base64Image)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        # Resize
        img = cv2.resize(img, (width, height))
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Binary threshold (invert so walls are white)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        # Morphological closing to connect wall gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        # Edge detection on closed mask
        edges = cv2.Canny(closed, 50, 150)
        # Hough lines detection
        min_length = max(width, height) * 0.5
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100,
                               minLineLength=int(min_length), maxLineGap=10)
        edges_list = []
        tol = 10  # tolerance in pixels for border proximity
        # Keep only perimeter-aligned lines near image borders
        if lines is not None:
            for l in lines:
                x1, y1, x2, y2 = l[0]
                # horizontal near top or bottom
                if abs(y1 - y2) < tol and (y1 < tol or y1 > height-1-tol):
                    edges_list.append({'start': {'x': int(x1), 'y': int(y1)},
                                        'end':   {'x': int(x2), 'y': int(y2)},
                                        'type': 'perimeter'})
                # vertical near left or right
                elif abs(x1 - x2) < tol and (x1 < tol or x1 > width-1-tol):
                    edges_list.append({'start': {'x': int(x1), 'y': int(y1)},
                                        'end':   {'x': int(x2), 'y': int(y2)},
                                        'type': 'perimeter'})
        # Invert closed mask to get interior regions (rooms/spaces)
        inv_mask = cv2.bitwise_not(closed)
        # Contours for regions
        cnts, _ = cv2.findContours(inv_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = []
        for idx, c in enumerate(cnts):
            x, y, w, h = cv2.boundingRect(c)
            contours.append({'id': f'contour_{idx}', 'bounds': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)}, 'area': int(w*h)})
        # Classify regions
        total_area = width * height
        regions = []
        for c in contours:
            a = c['area']
            regions.append({'id': c['id'], 'bounds': c['bounds'], 'suitableForRacks': a > total_area*0.02, 'type': 'main_area' if a > total_area*0.2 else 'storage_area'})
        # Detect individual shelf cells (small rectangles) using binary mask
        cell_cnts, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        rack_cells = []
        # Filter parameters for shelf cells
        min_area = total_area * 0.001
        max_area = total_area * 0.03
        min_ratio = 0.3
        max_ratio = 3.0
        for idx, c in enumerate(cell_cnts):
            epsilon = 0.02 * cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, epsilon, True)
            if len(approx) == 4 and cv2.isContourConvex(approx):
                x, y, w, h = cv2.boundingRect(approx)
                area = w * h
                ratio = w / float(h) if h > 0 else 0
                # filter by area and aspect ratio
                if min_area < area < max_area and min_ratio < ratio < max_ratio:
                    rack_cells.append({
                        'id': f'rack_cell_{idx}',
                        'bounds': {'x': x, 'y': y, 'width': w, 'height': h},
                        'area': area
                    })
        return jsonify(edges=edges_list, contours=contours, regions=regions, racks=rack_cells,
                       dimensions={'width': width, 'height': height})
    except Exception as e:
        return jsonify(error=str(e)), 500

if __name__ == '__main__':
    # Listen on port 5001 to avoid macOS system services
    app.run(host='0.0.0.0', port=5001) 