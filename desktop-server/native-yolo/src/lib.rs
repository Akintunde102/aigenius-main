use neon::prelude::*;
use std::sync::Mutex;
use tract_onnx::prelude::*;
use image::{DynamicImage, GenericImageView, ImageReader};
use ndarray::{Array, ArrayView, Axis};

// COCO 80-class labels
const COCO_LABELS: [&str; 80] = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
    "truck", "boat", "traffic light", "fire hydrant", "stop sign",
    "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag",
    "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana",
    "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza",
    "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table",
    "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
    "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock",
    "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
];

const INPUT_SIZE: u32 = 416;
const CONF_THRESHOLD: f32 = 0.05;
const NUM_CLASSES: usize = 80;

// Global model cache
static MODEL: Mutex<Option<SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>>> = Mutex::new(None);

/// Load the ONNX model into memory (called once at startup)
fn load_model(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let model_path = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Load and optimize the model
    let model = tract_onnx::onnx()
        .model_for_path(&model_path)
        .or_else(|e| cx.throw_error(format!("Failed to load model: {}", e)))?
        .into_optimized()
        .or_else(|e| cx.throw_error(format!("Failed to optimize model: {}", e)))?
        .into_runnable()
        .or_else(|e| cx.throw_error(format!("Failed to make model runnable: {}", e)))?;
    
    // Store in global cache
    let mut cached = MODEL.lock().unwrap();
    *cached = Some(model);
    
    Ok(cx.boolean(true))
}

/// Preprocess image: resize to 416x416, convert to RGB, normalize to [0, 1]
fn preprocess_image(img_path: &str) -> Result<Tensor, String> {
    // Load image
    let img = ImageReader::open(img_path)
        .map_err(|e| format!("Failed to open image: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    
    // Resize with letterboxing (contain with gray padding)
    let resized = img.resize_exact(INPUT_SIZE, INPUT_SIZE, image::imageops::FilterType::Lanczos3);
    let rgb = resized.to_rgb8();
    
    // Convert to CHW format (Channel-Height-Width) with RGB order
    let pixels_per_channel = (INPUT_SIZE * INPUT_SIZE) as usize;
    let mut float_data = vec![0.0f32; 3 * pixels_per_channel];
    
    for (i, pixel) in rgb.pixels().enumerate() {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;
        
        // RGB channel order (CHW layout)
        float_data[i] = r;                              // R channel
        float_data[pixels_per_channel + i] = g;        // G channel
        float_data[2 * pixels_per_channel + i] = b;    // B channel
    }
    
    // Create tensor [1, 3, 416, 416]
    let array = Array::from_shape_vec((1, 3, INPUT_SIZE as usize, INPUT_SIZE as usize), float_data)
        .map_err(|e| format!("Failed to create array: {}", e))?;
    
    Ok(array.into())
}

/// Decode YOLOX output: [1, N, 85] -> list of detected labels
fn decode_detections(output: &Tensor) -> Vec<String> {
    let view = output.to_array_view::<f32>().unwrap();
    let shape = view.shape();
    let num_boxes = shape[1];
    
    let mut detected = std::collections::HashSet::new();
    let mut max_conf = 0.0f32;
    
    for box_idx in 0..num_boxes {
        let box_data = view.index_axis(Axis(1), box_idx);
        
        // Get objectness confidence
        let obj_conf = box_data[4];
        
        // Find best class
        let mut best_class_conf = 0.0f32;
        let mut best_class_idx = 0;
        
        for cls in 0..NUM_CLASSES {
            let cls_conf = box_data[5 + cls];
            if cls_conf > best_class_conf {
                best_class_conf = cls_conf;
                best_class_idx = cls;
            }
        }
        
        let final_conf = obj_conf * best_class_conf;
        
        if final_conf > max_conf {
            max_conf = final_conf;
        }
        
        if final_conf >= CONF_THRESHOLD {
            detected.insert(COCO_LABELS[best_class_idx].to_string());
        }
    }
    
    detected.into_iter().collect()
}

/// Main inference function: tag an image and return detected labels
fn tag_image(mut cx: FunctionContext) -> JsResult<JsArray> {
    let image_path = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Get cached model
    let model_lock = MODEL.lock().unwrap();
    let model = model_lock.as_ref()
        .ok_or_else(|| cx.throw_error("Model not loaded. Call loadModel first."))?;
    
    // Preprocess image
    let input_tensor = preprocess_image(&image_path)
        .or_else(|e| cx.throw_error(format!("Preprocessing failed: {}", e)))?;
    
    // Run inference
    let result = model.run(tvec!(input_tensor.into()))
        .or_else(|e| cx.throw_error(format!("Inference failed: {}", e)))?;
    
    // Decode detections
    let tags = decode_detections(&result[0]);
    
    // Convert to JS array
    let js_array = JsArray::new(&mut cx, tags.len() as u32);
    for (i, tag) in tags.iter().enumerate() {
        let js_string = cx.string(tag);
        js_array.set(&mut cx, i as u32, js_string)?;
    }
    
    Ok(js_array)
}

/// Check if model is loaded
fn is_model_loaded(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let model_lock = MODEL.lock().unwrap();
    Ok(cx.boolean(model_lock.is_some()))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("loadModel", load_model)?;
    cx.export_function("tagImage", tag_image)?;
    cx.export_function("isModelLoaded", is_model_loaded)?;
    Ok(())
}
