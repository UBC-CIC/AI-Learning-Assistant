
import {
  TextField,
  Button,
  Typography,
  IconButton,
  Grid,
  Box,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
const ImagesWithText = ({
  newImagesWithText,
  setNewImagesWithText,
}) => {
  const handleNewImageWithTextChange = (index, field, value) => {
    const updatedImages = [...newImagesWithText];
    updatedImages[index][field] = value;
    setNewImagesWithText(updatedImages);
  };

  const handleRemoveNewImageWithText = (id) => {
    const updatedImages = newImagesWithText.filter((img) => img.id !== id);
    setNewImagesWithText(updatedImages);
  };

  const handleAddImageWithText = () => {
    setNewImagesWithText([
      ...newImagesWithText,
      { id: Date.now(), image: "", text: "" },
    ]);
  };
  return (
    <Box
      sx={{
        border: 1,
        borderRadius: 3,
        borderColor: "grey.400",
        p: 1,
        marginY: 2,
      }}
    >
      <Typography variant="h6" sx={{ p: 1, mt: 2 }}>
        Images with Text
      </Typography>

      <Box sx={{ p: 1, mb: 2 }}>
        <Typography variant="h7">
          Please provide a brief description of the image for the LLM.
        </Typography>
      </Box>
      {newImagesWithText.map((img, index) => (
        <Grid sx={{ pb: 2 }} container spacing={2} key={img.id}>
          <Grid item xs={12}>
            <input
              type="file"
              accept=".bmp,.eps,.gif,.icns,.ico,.im,.jpeg,.jpg,.j2k,.jp2,.msp,.pcx,.png,.ppm,.pgm,.pbm,.sgi,.tga,.tiff,.tif,.webp,.xbm"
              style={{ paddingLeft: 10 }}
              onChange={(e) =>
                handleNewImageWithTextChange(index, "image", e.target.files[0])
              }
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Text"
              value={img.text}
              onChange={(e) =>
                handleNewImageWithTextChange(index, "text", e.target.value)
              }
              sx={{ width: "50%" }}
              margin="normal"
            />
            <IconButton onClick={() => handleRemoveNewImageWithText(img.id)}>
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Button
        variant="contained"
        color="primary"
        onClick={handleAddImageWithText}
        sx={{ margin: 2 }}
      >
        Add Another
      </Button>
    </Box>
  );
};

export default ImagesWithText;
