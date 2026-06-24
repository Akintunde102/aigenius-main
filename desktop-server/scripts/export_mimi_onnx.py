import torch
from pocket_tts import TTSModel
from pathlib import Path

def export_mimi():
    tts = TTSModel.load_model()
    mimi = tts.mimi
    mimi.eval()
    
    # Mimi input is (batch, codebook_size, seq_len) or similar
    # For decoding, it takes codes.
    # Let's check mimi.decode signature
    import inspect
    print(f"Mimi decode Signature: {inspect.signature(mimi.decode)}")
    
    # Usually Mimi.decode(codes) where codes is (batch, K, T)
    dummy_codes = torch.zeros(1, 8, 32, dtype=torch.long)
    
    out_path = Path("models/mimi_decoder.onnx")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    # We'll use a wrapper to make it traceable
    class MimiDecoder(torch.nn.Module):
        def __init__(self, mimi):
            super().__init__()
            self.mimi = mimi
        def forward(self, codes):
            return self.mimi.decode(codes)

    decoder = MimiDecoder(mimi)
    
    print(f"Exporting Mimi decoder to {out_path}...")
    torch.onnx.export(
        decoder,
        dummy_codes,
        str(out_path),
        opset_version=17,
        input_names=["codes"],
        output_names=["audio"],
        dynamic_axes={
            "codes": {0: "batch", 2: "seq_len"},
            "audio": {0: "batch", 2: "audio_len"}
        }
    )
    print("Done!")

if __name__ == "__main__":
    export_mimi()
