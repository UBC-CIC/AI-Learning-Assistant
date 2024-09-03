import { useState, useEffect } from "react";

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
  imagesWithText, 
  setImagesWithText,
  savedImagesWithText,
  setSavedImagesWithText,
  newImagesWithText,
  setNewImagesWithText,
  loading,
 }) => {
  useEffect(() => {
    console.log(imagesWithText);
  }, [imagesWithText]);
  const handleImageWithTextChange = (index, field, value) => {
    const updatedImages = [...imagesWithText];
    updatedImages[index][field] = value;
    setImagesWithText(updatedImages);
  };

  const handleAddImageWithText = () => {
    setImagesWithText([
      ...imagesWithText,
      { id: Date.now(), image: "", text: "" },
    ]);
  };

  const handleRemoveImageWithText = (id) => {
    const updatedImages = imagesWithText.filter((img) => img.id !== id);
    setImagesWithText(updatedImages);
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

      {imagesWithText.map((img, index) => (
        <Grid sx = {{pb: 2}} container spacing={2} key={img.id}>
          <Grid item xs={12}>
            <input
              type="file"
              accept=".bmp,.eps,.gif,.icns,.ico,.im,.jpeg,.jpg,.j2k,.jp2,.msp,.pcx,.png,.ppm,.pgm,.pbm,.sgi,.tga,.tiff,.tif,.webp,.xbm"
              style={{ paddingLeft: 10 }}
              onChange={(e) =>
                handleImageWithTextChange(index, "image", e.target.files[0])
              }
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Text"
              value={img.text}
              onChange={(e) =>
                handleImageWithTextChange(index, "text", e.target.value)
              }
              sx={{ width: "50%" }}
              margin="normal"
            />
            <IconButton onClick={() => handleRemoveImageWithText(img.id)}>
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
